import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import config from '../../config/config';

describe('Interaction API Integration', () => {
  let testUserId: number;
  let testPostId: number;

  beforeAll(async () => {
    // 1. Crear usuario de prueba
    const user = await prisma.user.create({
      data: {
        email: 'test_interaction@kikiri.com',
        username: 'interaction_tester',
        password: 'password123',
        role: 1
      }
    });
    testUserId = user.id;

    // 2. Crear post de prueba
    const post = await prisma.post.create({
      data: {
        content: 'Post de prueba para interacciones',
        authorId: testUserId
      }
    });
    testPostId = post.id;
  });

  afterAll(async () => {
    // Limpiar datos
    await prisma.comment.deleteMany();
    await prisma.like.deleteMany();
    await prisma.share.deleteMany();
    await prisma.post.deleteMany({ where: { authorId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('Likes', () => {
    it('should add a like to a post', async () => {
      const res = await request(app)
        .post(`${config.apiBasePath}/v1/posts/${testPostId}/like`) 
        .send({ userId: testUserId });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Like agregado correctamente');

      const updatedPost = await prisma.post.findUnique({ where: { id: testPostId } });
      expect(updatedPost?.likesCount).toBe(1);
    });

    it('should not allow duplicate likes', async () => {
      const res = await request(app)
        .post(`${config.apiBasePath}/v1/posts/${testPostId}/like`)
        .send({ userId: testUserId });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('El usuario ya dio like a este post');
    });

    it('should remove a like', async () => {
      const res = await request(app)
        .delete(`${config.apiBasePath}/v1/posts/${testPostId}/like`)
        .send({ userId: testUserId });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Like removido correctamente');

      const updatedPost = await prisma.post.findUnique({ where: { id: testPostId } });
      expect(updatedPost?.likesCount).toBe(0);
    });
  });

  describe('Shares', () => {
    it('should share a post and increment counter', async () => {
      const res = await request(app)
        .post(`${config.apiBasePath}/v1/posts/${testPostId}/share`)
        .send({ userId: testUserId });

      expect(res.status).toBe(200);
      
      const updatedPost = await prisma.post.findUnique({ where: { id: testPostId } });
      expect(updatedPost?.sharesCount).toBe(1);
    });
  });
});