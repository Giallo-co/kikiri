import request from 'supertest';
import app from '../../app';

describe('User API Integration Tests', () => {
    const newUser = {
        email: "test@example.com",
        username: "testuser",
        password: "password123"
    };

    it('should register a new user (POST /v1/register)', async () => {
        const res = await request(app)
            .post('/user/v1/register')
            .send(newUser);
        
        expect(res.status).toBe(201);
        expect(res.body.email).toBe(newUser.email);
    });

    it('should get a user by email (GET /v1/users/:email)', async () => {
        const res = await request(app).get(`/user/v1/users/${newUser.email}`);
        expect(res.status).toBe(200);
        expect(res.body.username).toBe(newUser.username);
    });

    it('should update user info (PUT /v1/users/:id)', async () => {
        const res = await request(app)
            .put('/user/v1/users/1')
            .send({ username: "updatedName" });
        
        expect(res.status).toBe(200);
        expect(res.body.username).toBe("updatedName");
    });

    it('should delete a user (DELETE /v1/users/:id)', async () => {
        const res = await request(app).delete('/user/v1/users/1');
        expect(res.status).toBe(204);
    });
});