import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';

const simulateExecution = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 50));

describe('Feed API Integration', () => {

  afterAll(async () => {
    // Opcional: Limpiar los datos de prueba al terminar
    await prisma.follow.deleteMany();
    await prisma.user.deleteMany({
        where: { email: { contains: '@kikiri.com' } }
    });
    
    await prisma.$disconnect();
  });

  it('should return 200 and a feed response for a numeric userId', async () => {
    await simulateExecution();

    const res = await request(app).get('/user/v1/feed/1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userId', 1);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('should return 400 for invalid userId', async () => {
    await simulateExecution();

    const res = await request(app).get('/user/v1/feed/not-a-number');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid userId' });
  });
});