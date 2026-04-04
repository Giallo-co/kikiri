import prisma from '../lib/prisma';

export class InteractionRepository {
  async addLike(userId: number, postId: number) {
    return await prisma.$transaction([
      prisma.like.create({
        data: { userId, postId },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
  }

  async removeLike(userId: number, postId: number) {
    return await prisma.$transaction([
      prisma.like.delete({
        where: {
          userId_postId: { userId, postId },
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);
  }

  async checkUserLikedPost(userId: number, postId: number) {
    const like = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    return !!like;
  }

  async addComment(userId: number, postId: number, content: string) {
    return await prisma.comment.create({
      data: {
        userId,
        postId,
        content,
      },
      include: {
        user: { select: { username: true, profile: { select: { avatarUrl: true } } } },
      },
    });
  }

  async getCommentsByPost(postId: number) {
    return await prisma.comment.findMany({
      where: { postId },
      include: {
        user: { select: { username: true, profile: { select: { avatarUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addShare(userId: number, postId: number) {
    return await prisma.$transaction([
      prisma.share.create({
        data: { userId, postId },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { sharesCount: { increment: 1 } },
      }),
    ]);
  }

  async checkUserSharedPost(userId: number, postId: number) {
    const share = await prisma.share.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    return !!share;
  }

  async getCommentById(commentId: number) {
    return await prisma.comment.findUnique({
      where: { id: commentId },
    });
  }

  async deleteComment(commentId: number) {
    return await prisma.comment.delete({
      where: { id: commentId },
    });
  }
}