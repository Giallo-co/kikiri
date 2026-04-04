import { UserRepository } from '../repositories/userRepository';
import { ServiceException } from '../errors/ServiceException';
import { User } from '../models/userModel';
import config from '../config/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export class UserService {
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
    
    // Validar y encriptar la contraseña si se incluye en la actualización
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

  public async deleteUser(userId: number): Promise<boolean> {
    const deleted = await this.userRepository.delete(userId);

    if (!deleted) {
      throw new ServiceException(1003, "User not found.");
    }

    return true;
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
}