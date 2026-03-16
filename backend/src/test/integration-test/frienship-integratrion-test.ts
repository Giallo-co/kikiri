import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';

const simulateExecution = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 500));

describe('Friendship API Integration Flow', () => {
  let userId: number;
  let friendIdA: number;
  let friendIdB: number;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Crear usuarios reales para las pruebas
  it('should register a user and friends first', async () => {
    await simulateExecution();
    
    // Crear un usuario principal
    const res = await request(app).post('/user/v1/register').send({
      email: `social_${Date.now()}@kikiri.com`,
      username: "SocialUser",
      password: "password123"
    });
    expect(res.status).toBe(201);
    userId = res.body.id;

    // Amigo A
    const resFriendA = await request(app).post('/user/v1/register').send({
      email: `friendA_${Date.now()}@kikiri.com`,
      username: "FriendA",
      password: "password123"
    });
    friendIdA = resFriendA.body.id;

    // Amigo B
    const resFriendB = await request(app).post('/user/v1/register').send({
      email: `friendB_${Date.now()}@kikiri.com`,
      username: "FriendB",
      password: "password123"
    });
    friendIdB = resFriendB.body.id;
  });

  it('should add a friend (POST /user/v1/friend)', async () => {
    await simulateExecution();
    const res = await request(app).post('/user/v1/friend').send({
      userId: userId,
      friendId: friendIdA
    });

    expect(res.status).toBe(200);
    expect(res.body.friends).toContain(friendIdA);
  });

  it('should get friend list (GET /user/v1/users/:id/friends)', async () => {
    await simulateExecution();
    await request(app).post('/user/v1/friend').send({ userId, friendId: friendIdB });

    const res = await request(app).get(`/user/v1/users/${userId}/friends`);

    expect(res.status).toBe(200);
    expect(res.body.friends).toContain(friendIdA);
    expect(res.body.friends).toContain(friendIdB);
  });

  it('should update the full friend list (PUT /user/v1/users/:id/friends)', async () => {
    await simulateExecution();
    const newFriendList = [888, 999];

    const res = await request(app)
        .put(`/user/v1/users/${userId}/friends`)
        .send({ friends: newFriendList });

    expect(res.status).toBe(200);
    expect(res.body.friends).toEqual(newFriendList);
  });

  it('should delete a specific friend (DELETE /user/v1/users/:id/friends/:friendId)', async () => {
    await simulateExecution();
    const res = await request(app).delete(`/user/v1/users/${userId}/friends/888`);

    expect(res.status).toBe(200);
    expect(res.body.friends).not.toContain(888);
  });
});