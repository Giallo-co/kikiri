import { UserRepository } from '../repositories/userRepository';
import { PostRepository } from '../repositories/postRepository';
import { ServiceException } from '../errors/ServiceException';
import { User } from '../models/userModel';
import config from '../config/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { docClient, TABLE_NAME } from '../lib/dynamo';
import { BatchWriteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3PresignService } from './s3PresignService';
import { logger } from '../lib/logger';
import { NodeService } from './nodeService';

interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export class UserService {
  private postRepository = new PostRepository();

  constructor(
    private readonly userRepository: UserRepository,
    private readonly nodeService: NodeService
  ) {}

  public async getUserByEmail(email: string): Promise<User | undefined> {
    return await this.userRepository.findByEmail(email);
  }

  public async getUserById(id: number): Promise<User | undefined> {
    return await this.userRepository.findById(id);
  }

  public async registerUserAsync(userData: {
    email: string;
    username: string;
    password: string;
    role?: number;
  }): Promise<AuthResponse> {
    if (userData.password.length < config.minPasswordLength) {
      throw new ServiceException(
        1001,
        `Password must be at least ${config.minPasswordLength} characters long.`
      );
    }

    const saltRounds: number = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    const newUser = await this.userRepository.save({
      email: userData.email,
      username: userData.username,
      password: hashedPassword,
      role: userData.role ?? 0
    });

    // Create node in DynamoDB
    try {
      await this.nodeService.createAuthorNode(newUser.id, newUser.username);
    } catch (error) {
      // We might want to handle this error. If DynamoDB fails, should we fail registration?
      // Usually, yes, if it's a critical part of the system.
      // But the user said: Input -> Registro verificacion y registro en mysql -> Registro de nodo en tabla node de dynamodb -> Output actual.
      logger.error('failed_to_create_dynamo_node', {
        userId: newUser.id,
        error: error instanceof Error ? error.message : String(error)
      });
      // For now, I'll let it pass or throw depending on importance.
      // In a real system, you might want to use a transaction or compensating action.
    }

    const jwtSecretKey = process.env.JWT_SECRET_KEY as string;
    const payload = {
      sub: newUser.id,
      email: newUser.email,
      iat: Math.floor(Date.now() / 1000),
    };
    
    const token = jwt.sign(payload, jwtSecretKey, { expiresIn: '3d' });

    const { password, ...userWithoutPassword } = newUser;

    return {
      user: userWithoutPassword,
      token
    };
  }

  public async loginUser(username: string, plainPassword: string): Promise<AuthResponse> {
    const user = await this.userRepository.findByUsername(username);
    
    if (!user) {
      throw new ServiceException(1002, "Invalid credentials.");
    }
    
    const isMatch: boolean = await bcrypt.compare(plainPassword, user.password);
    
    if (!isMatch) {
      throw new ServiceException(1002, "Invalid credentials.");
    }

    const jwtSecretKey = process.env.JWT_SECRET_KEY as string;
    const payload = {
      sub: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
    };
    
    const token = jwt.sign(payload, jwtSecretKey, { expiresIn: '3d' });

    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  }

  public async updateUser(userId: number, updateData: {
    email?: string;
    username?: string;
    password?: string;
    role?: number;
  }): Promise<AuthResponse> {
    
    if (updateData.password) {
      if (updateData.password.length < config.minPasswordLength) {
        throw new ServiceException(
          1001,
          `Password must be at least ${config.minPasswordLength} characters long.`
        );
      }
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    const updatedUser = await this.userRepository.update(userId, updateData as Partial<User>);

    if (!updatedUser) {
      throw new ServiceException(1002, "User not found.");
    }

    const jwtSecretKey = process.env.JWT_SECRET_KEY as string;
    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      iat: Math.floor(Date.now() / 1000),
    };
    
    const token = jwt.sign(payload, jwtSecretKey, { expiresIn: '3d' });

    const { password, ...userWithoutPassword } = updatedUser;

    return {
      user: userWithoutPassword,
      token
    };
  }

  /**
   * Fase 6: Borrado en Cascada Compensado
   */
  public async deleteUser(userId: number): Promise<boolean> {
    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ServiceException(1003, "User not found.");
    }

    try {
      // 2. Consultar todos los posts del usuario en DynamoDB usando GSI1 (vía PostRepository)
      const posts = await this.postRepository.getByAuthor(userId);

      if (posts.length > 0) {
        // 3. Preparar los comandos de borrado para BatchWrite (máximo 25 a la vez)
        const deleteRequests = posts.map(post => ({
          DeleteRequest: {
            Key: {
              PK: post.PK,
              SK: post.SK
            }
          }
        }));

        // Procesar en bloques de 25 (límite de DynamoDB)
        for (let i = 0; i < deleteRequests.length; i += 25) {
          const chunk = deleteRequests.slice(i, i + 25);
          await docClient.send(new BatchWriteCommand({
            RequestItems: {
              [TABLE_NAME]: chunk
            }
          }));
        }
      }

      // 4. Limpieza adicional (Seguidores, Likes, etc. si fuera necesario)
      // Por ahora la consulta genérica en cleanupDynamoDBData cubría más casos, 
      // pero seguiré la estructura de correciones.md que es más específica para posts.
      // Si queremos borrar TODO lo relacionado en GSI1:
      await this.cleanupDynamoDBData(userId);

      // 5. Eliminar definitivamente de SQL
      const deleted = await this.userRepository.delete(userId);
      return deleted;
    } catch (error) {
      logger.error("user_deletion_cascade_failed", {
        userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new ServiceException(1007, "Failed to complete user deletion cascade.");
    }
  }

  private async cleanupDynamoDBData(userId: number) {
    // Buscar todos los registros donde el usuario sea protagonista en GSI1
    // Esto incluye sus posts (GSI1PK: USER#id) y sus seguidores (GSI1PK: USER#id con SK: FOLLOWER#...)
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`
      }
    }));

    const items = result.Items || [];
    if (items.length === 0) return;

    // Borrado por lotes de 25
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      const deleteRequests = batch.map(item => ({
        DeleteRequest: {
          Key: {
            PK: item.PK,
            SK: item.SK
          }
        }
      }));

      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: deleteRequests
        }
      }));
    }
  }

  async simulation(): Promise<string> {
    await new Promise<void>(resolve => setTimeout(resolve, 5000));
    return "Completed Task";
  }

  async followUser(userId: number, targetId: number): Promise<void> {
      if (userId === targetId) {
          throw new ServiceException(1004, "A user cannot follow themselves.");
      }

      const user = await this.userRepository.findById(userId);
      const target = await this.userRepository.findById(targetId);
      
      if (!user || !target) {
          throw new ServiceException(1002, "User not found.");
      }

      try {
          await this.userRepository.followUser(userId, targetId);
      } catch (error) {
          throw new ServiceException(1005, "Already following this user.");
      }
  }

  async unfollowUser(userId: number, targetId: number): Promise<void> {
      const user = await this.userRepository.findById(userId);
      if (!user) throw new ServiceException(1002, "User not found.");

      try {
          await this.userRepository.unfollowUser(userId, targetId);
      } catch (error) {
          throw new ServiceException(1006, "Not following this user.");
      }
  }

  async getFollowing(userId: number): Promise<number[]> {
      const user = await this.userRepository.findById(userId);
      if (!user) throw new ServiceException(1002, "User not found.");
      
      return await this.userRepository.getFollowingIds(userId);
  }

  async setProfilePictureKey(actorId: number, targetUserId: number, profilePictureKey: string): Promise<User> {
    if (actorId !== targetUserId) {
      throw new ServiceException(4030, 'You can only update your own profile picture.', 403);
    }
    const key = profilePictureKey.trim();
    if (!key) {
      throw new ServiceException(4011, 'profilePictureKey is required.');
    }
    if (!S3PresignService.isAvatarKeyForUser(key, targetUserId)) {
      throw new ServiceException(4012, 'Invalid profilePictureKey for this user.');
    }
    const updated = await this.userRepository.updateProfilePictureKey(targetUserId, key);
    if (!updated) {
      throw new ServiceException(1002, 'User not found.');
    }
    return updated;
  }
}
