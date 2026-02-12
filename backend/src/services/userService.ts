import { UserRepository } from '../repositories/userRepository';
import { ServiceException } from '../errors/ServiceException';
import { User } from '../models/user';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  public async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findByEmail(email);
  }

  public async registerUserAsync(userData: {
    email: string;
    username: string;
    password: string;
    role?: number;
  }): Promise<User> {
    if (userData.password.length < 8) {
      throw new ServiceException(1001, "Password must be at least 8 characters long.");
    }

    const newUser = await this.userRepository.save({
      email: userData.email,
      username: userData.username,
      password: userData.password,
      role: userData.role ?? 0
    });

    const userWithEncryptedPassword: User = {
      ...newUser,
      password: "encrypted",
      role: newUser.role
    };

    return userWithEncryptedPassword;
  }

  public async updateUser(userId: number, updateData: {
    email?: string;
    username?: string;
    password?: string;
    role?: number;
  }): Promise<User> {
    const updatedUser = await this.userRepository.update(userId, updateData as Partial<User>);

    if (!updatedUser) {
      throw new ServiceException(1002, "User not found.");
    }

    return {
      ...updatedUser,
      password: "encrypted",
      role: updatedUser.role
    };
    
  }

  public async deleteUser(userId: number): Promise<boolean> {
    const deleted = await this.userRepository.delete(userId);

    if (!deleted) {
      throw new ServiceException(1003, "User not found.");
    }

    return true;
  }

  simulation(): Promise<string> {
      return new Promise((resolve) => {
          setTimeout(() => {
              resolve("Completed Task");
          }, 5000);
      })
  }

  async addFriendAsync(userId: number, friendId: number): Promise<User> {
      const user = await this.userRepository.getUserByIdAsync(userId);
      
      if (!user) {
          throw new ServiceException(1002, "User not found for friendship.");
      }

      if (!user.friends) {
          user.friends = [];
      }
      
      // Evitar duplicados si es necesario
      if (!user.friends.includes(friendId)) {
        user.friends.push(friendId);
      }

      await this.userRepository.saveRelationshipAsync(user);
      return user;
  }

  async getFriends(userId: number): Promise<number[]> {
      const user = await this.userRepository.getUserByIdAsync(userId);
      if (!user) throw new ServiceException(1002, "User not found.");
      
      return user.friends || [];
  }

  async removeFriend(userId: number, friendId: number): Promise<User> {
      const user = await this.userRepository.getUserByIdAsync(userId);
      if (!user) throw new ServiceException(1002, "User not found.");

      if (user.friends) {
          user.friends = user.friends.filter(id => id !== friendId);
      }

      await this.userRepository.saveRelationshipAsync(user);
      return user;
  }

  async updateFriendList(userId: number, newFriendList: number[]): Promise<User> {
      const user = await this.userRepository.getUserByIdAsync(userId);
      if (!user) throw new ServiceException(1002, "User not found.");

      user.friends = newFriendList;

      await this.userRepository.saveRelationshipAsync(user);
      return user;
  }

}
