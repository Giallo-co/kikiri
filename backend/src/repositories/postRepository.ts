import prisma from '../lib/prisma';
import { Post } from '../models/postModel';

export class PostRepository {
    async getAll(): Promise<any[]> {
      return await prisma.post.findMany();
    }
  
    async getByAuthor(authorId: number): Promise<any[]> {
      return await prisma.post.findMany({
        where: { authorId }
      });
    }
  
    async save(post: Omit<Post, 'id' | 'createdAt'>): Promise<any> {
      return await prisma.post.create({
        data: {
          content: post.content,
          authorId: post.authorId,
          likes: post.likes
        }
      });
    }
}