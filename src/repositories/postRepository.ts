import prisma from '../lib/prisma';
import { Post } from '../models/postModel';

export class PostRepository {
    async getAll(): Promise<any[]> {
      return await prisma.post.findMany({
        include: {
          author: {
            select: { username: true, profile: { select: { avatarUrl: true } } }
          },
          _count: {
            select: { comments: true, likesRel: true, shares: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }
  
    async getByAuthor(authorId: number): Promise<any[]> {
      return await prisma.post.findMany({
        where: { authorId },
        include: {
          _count: {
            select: { comments: true, likesRel: true, shares: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }
  
    async save(post: Omit<Post, 'id' | 'createdAt' | 'likesCount' | 'sharesCount'>): Promise<any> {
      return await prisma.post.create({
        data: {
          content: post.content,
          authorId: post.authorId,
        }
      });
    }
}