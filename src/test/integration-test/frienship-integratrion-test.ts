import supertest from 'supertest';
import app from '../../app.js';

describe('Friendship Integration', () => {
  it('should add a friend and return the updated user with the new friend', async () => {
    
    const response = await supertest(app).post('/user/v1/friend').send({
      userId: 1,      // El ID del usuario principal
      friendId: 99    // El ID del amigo que queremos agregar
    });

    // Validaciones
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty("friends");
    expect(response.body.friends).toContain(99);
  });
});