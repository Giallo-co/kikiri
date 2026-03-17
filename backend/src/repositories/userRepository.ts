import prisma from '../lib/prisma';
import { User } from '../models/userModel';

export class UserRepository {

  async save(user: Omit<User, 'id' | 'publicId'>): Promise<User> {
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

  async findByPublicId(publicId: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({
      where: { publicId },
    });
    return user ? (user as unknown as User) : undefined;
  }

  async searchByQuery(query: string, skip: number, take: number): Promise<{ data: User[]; total: number }> {
    const whereClause = {
      OR: [
        { username: { contains: query } },
        // Si quieres que también busque por email, puedes dejar la siguiente línea:
        { email: { contains: query } }
      ]
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take,
      }),
      prisma.user.count({ where: whereClause })
    ]);

    return { data: data as unknown as User[], total };
  }

  async update(userId: number, update: Partial<User>): Promise<User | undefined> {
    try {
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

  callToExternalServiceAsync = async (): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("External call success.");
      }, 200);
    });
  };

  async followUser(followerId: number, followingId: number): Promise<void> {
    await prisma.follow.create({
      data: { followerId, followingId },
    });
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    await prisma.follow.delete({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });
  }

  async getFollowingIds(userId: number): Promise<number[]> {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    return follows.map(f => f.followingId);
  }
}