import request from 'supertest';
import app from '../../app'; 

describe('Friendship API Integration Flow', () => {
  let userId: number;
  const friendIdA = 101;
  const friendIdB = 102;

  // Crear un usuario real para las pruebas
  it('should register a user first to test friendships', async () => {
    const res = await request(app).post('/user/v1/register').send({
      email: "social@kikiri.com",
      username: "SocialUser",
      password: "password123"
    });

    expect(res.status).toBe(201);
    userId = res.body.id;
  });

  it('should add a friend (POST /user/v1/friend)', async () => {
    const res = await request(app).post('/user/v1/friend').send({
      userId: userId,
      friendId: friendIdA
    });

    expect(res.status).toBe(200);
    expect(res.body.friends).toContain(friendIdA);
  });

  it('should get friend list (GET /user/v1/users/:id/friends)', async () => {
    await request(app).post('/user/v1/friend').send({ userId, friendId: friendIdB });

    const res = await request(app).get(`/user/v1/users/${userId}/friends`);

    expect(res.status).toBe(200);
    expect(res.body.friends).toHaveLength(2);
    expect(res.body.friends).toEqual(expect.arrayContaining([friendIdA, friendIdB]));
  });

  it('should update the full friend list (PUT /user/v1/users/:id/friends)', async () => {
    const newFriendList = [888, 999];

    const res = await request(app)
        .put(`/user/v1/users/${userId}/friends`)
        .send({ friends: newFriendList });

    expect(res.status).toBe(200);
    expect(res.body.friends).toEqual(newFriendList);
    
    // Verificamos que este limpio
    const check = await request(app).get(`/user/v1/users/${userId}/friends`);
    expect(check.body.friends).not.toContain(friendIdA);
    expect(check.body.friends).toContain(888);
  });

  it('should delete a specific friend (DELETE /user/v1/users/:id/friends/:friendId)', async () => {
    const res = await request(app).delete(`/user/v1/users/${userId}/friends/888`);

    expect(res.status).toBe(200);
    expect(res.body.friends).not.toContain(888);
    expect(res.body.friends).toContain(999);
  });
});