import supertest from 'supertest';
import app from '../../app.js';

describe('UserRegister', () => {
  it('should return a success register object', async () => {
    
    const response = await supertest(app).post('/user/v1/register').send({
      email: "philipfallag@gmail.com",
      username: "Philip",
      password: "encrypted"
    });

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body).toHaveProperty("email");
    expect(response.body).toHaveProperty("username");
  });
});