import prisma from '../lib/prisma';
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
      // Construimos un objeto con las propiedades no undefined
      const dataToUpdate: any = {};
      if (update.email !== undefined) dataToUpdate.email = update.email;
      if (update.username !== undefined) dataToUpdate.username = update.username;
      if (update.password !== undefined) dataToUpdate.password = update.password;
      if (update.role !== undefined) dataToUpdate.role = update.role;

      const updated = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
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

  async saveRelationshipAsync(user: User): Promise<void> {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        friends: user.friends ?? [], 
      },
    });
  }
}