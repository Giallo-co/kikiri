import prisma from '../prisma';
import { User } from '../models/userModel';

export class UserRepository {

  async save(user: Omit<User, 'id' | 'friends'>): Promise<User> {
    const newUser = await prisma.user.create({
      data: {
        email: user.email,
        username: user.username,
        password: user.password,
        role: user.role,
      },
    });
    return newUser as unknown as User;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user ? (user as unknown as User) : undefined;
  }

  async findById(id: number): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user ? (user as unknown as User) : undefined;
  }

  async update(userId: number, update: Partial<User>): Promise<User | undefined> {
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          email: update.email,
          username: update.username,
          password: update.password,
          role: update.role,
        },
      });
      return updated as unknown as User;
    } catch (error) {
      return undefined;
    }
  }

  async delete(userId: number): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getUserByIdAsync(id: number): Promise<User | undefined> {
    return await this.findById(id);
  }

  callToExternalServiceAsync = async (): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("External call success.");
      }, 200);
    });
  };

  async saveRelationshipAsync(user: User): Promise<void> {
    await this.callToExternalServiceAsync();
  }
}