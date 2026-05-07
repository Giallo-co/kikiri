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
import { NodeRepository } from '../repositories/nodeRepository';

interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export class UserService {
  private postRepository = new PostRepository();
  private nodeService = new NodeService(new NodeRepository());

  constructor(private readonly userRepository: UserRepository) {}

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

    try {
      // Req 6.1: Crear AuthorNode en DynamoDB
      await this.nodeService.createNode({
        node_id: String(newUser.id),
        node_type: 'Author',
        node_name: newUser.username,
        author_id: String(newUser.id),
        author_name: newUser.username,
        author_real_name: newUser.username,
        author_description: 'New user joined the network',
      });
    } catch (error) {
      // Rollback MySQL if DynamoDB fails
      await this.userRepository.delete(newUser.id);
      logger.error('dynamodb_registration_failed_rollback_mysql', {
        userId: newUser.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new ServiceException(500, "Failed to create identity in graph database.");
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

  public async loginUser(email: string, plainPassword: string): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(email);
    
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

    // Req 6.3: Sincronizar actualización en DynamoDB
    if (updateData.username) {
      await this.nodeService.updateNode(String(userId), { 
        node_name: updatedUser.username,
        author_name: updatedUser.username 
      }).catch(err => logger.error('sync_update_dynamo_failed', { userId, err }));
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
   * Fase 6: Borrado en Cascada Compensado (Grafos)
   */
  public async deleteUser(userId: number): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ServiceException(1003, "User not found.");
    }

    try {
      const authorNode = await this.nodeService.getNodeById(String(userId)).catch(() => null);
      
      if (authorNode && authorNode.node_music_links_next) {
        // Borrar todos los nodos musicales asociados
        for (const musicId of authorNode.node_music_links_next) {
          await this.nodeService.deleteNode(musicId).catch(err => logger.error('delete_associated_music_failed', { musicId, err }));
        }
      }

      // Req 6.4: Sincronizar eliminación en DynamoDB (AuthorNode)
      await this.nodeService.deleteNode(String(userId));

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
          // Req 6.5: Sincronizar interacción en DynamoDB
          await this.nodeService.linkNodes(String(userId), String(targetId), 'node_author_links_next')
            .catch(err => logger.error('sync_follow_dynamo_failed', { userId, targetId, err }));
      } catch (error) {
          throw new ServiceException(1005, "Already following this user.");
      }
  }

  async unfollowUser(userId: number, targetId: number): Promise<void> {
      const user = await this.userRepository.findById(userId);
      if (!user) throw new ServiceException(1002, "User not found.");

      try {
          await this.userRepository.unfollowUser(userId, targetId);
          // Req 6.5: Sincronizar desvinculación en DynamoDB
          await this.nodeService.unlinkNodes(String(userId), String(targetId), 'node_author_links_next')
            .catch(err => logger.error('sync_unfollow_dynamo_failed', { userId, targetId, err }));
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
