import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import config from '../../config/config';

describe('Feed API Integration', () => {
  let authToken: string;
  let testUserId: number;

  beforeAll(async () => {
    // 1. Creamos un usuario en la BD para probar
    const user = await prisma.user.create({
      data: {
        email: 'test_feed@kikiri.com',
        username: 'feed_tester',
        password: 'password123', // no importa si no está hasheada porque entramos por token
        role: 1
      }
    });
    testUserId = user.id;

    // 2. Generamos un token válido para este usuario
    const jwtSecretKey = process.env.JWT_SECRET_KEY as string || 'test_secret'; 
    authToken = jwt.sign(
      { sub: testUserId, email: user.email, iat: Math.floor(Date.now() / 1000) }, 
      jwtSecretKey
    );
  });

  afterAll(async () => {
    // Limpiar datos
    await prisma.user.deleteMany({
      where: { email: 'test_feed@kikiri.com' }
    });

    await prisma.$disconnect();
  });

  it('should return 401 if no token is provided', async () => {
    // Intentamos entrar sin el .set('Authorization', ...)
    const res = await request(app).get(`${config.apiBasePath}/v1/feed/${testUserId}`);
    
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('should return 200 and a feed response when using valid token', async () => {
    const res = await request(app)
      .get(`${config.apiBasePath}/v1/feed/${testUserId}`)
      .set('Authorization', `Bearer ${authToken}`); // <-- Enviamos el token aquí

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userId', testUserId);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});