import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';

const simulateExecution = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 500));

describe('User API Integration Tests', () => {
    const newUser = {
        email: `test_${Date.now()}@example.com`, 
        username: "testuser",
        password: "password123"
    };
    
    afterAll(async () => {
        await prisma.$disconnect();
    });

    let createdUserId: number;

    it('should register a new user (POST /v1/register)', async () => {
        await simulateExecution();
        const res = await request(app)
            .post('/user/v1/register')
            .send(newUser);
        
        expect(res.status).toBe(201);
        expect(res.body.email).toBe(newUser.email);
        
        createdUserId = res.body.id; 
    });

    it('should get a user by email (GET /v1/users/:email)', async () => {
        await simulateExecution();
        const res = await request(app).get(
            `/user/v1/users/email/${encodeURIComponent(newUser.email)}`
        );
        expect(res.status).toBe(200);
        expect(res.body.username).toBe(newUser.username);
    });

    it('should update user info (PUT /v1/users/:id)', async () => {
        await simulateExecution();
        const res = await request(app)
            .put(`/user/v1/users/${createdUserId}`)
            .send({ username: "updatedName" });
        
        expect(res.status).toBe(200);
        expect(res.body.username).toBe("updatedName");
    });

    it('should delete a user (DELETE /v1/users/:id)', async () => {
        await simulateExecution();
        const res = await request(app).delete(`/user/v1/users/${createdUserId}`);
        expect(res.status).toBe(204);
    });
});