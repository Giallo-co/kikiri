import request from 'supertest';
import app from '../../app'; // Asegúrate que la ruta a app sea correcta

describe('Friendship Integration', () => {
  it('should add a friend and return the updated user with the new friend', async () => {
    
    const registration = await request(app)
      .post('/user/v1/register')
      .send({
        email: "amistad@test.com",
        username: "friendUser",
        password: "password123"
      });
      
    const userId = registration.body.id;

    const response = await request(app)
      .post('/user/v1/friend')
      .send({
        userId: userId, // Usamos el ID del usuario que acabamos de crear
        friendId: 99
      });

    // Validaciones
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty("friends");
    expect(response.body.friends).toContain(99);
  });
});