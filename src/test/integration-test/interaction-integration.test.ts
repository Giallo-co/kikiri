import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import { docClient } from '../../lib/dynamo';
import { PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import jwt from 'jsonwebtoken';
import config from '../../config/config';
import crypto from 'crypto';

const TABLE_NAME = "KikiriSocial";

describe('Interaction API Integration', () => {
    let authToken: string;
    let testUserId: number;
    let testPostId: string;

    beforeAll(async () => {
        const user = await prisma.user.create({
            data: {
                email: 'test_interaction@kikiri.com',
                username: 'interactor',
                password: 'password',
                role: 1
            }
        });
        testUserId = user.id;

        testPostId = crypto.randomUUID();
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `POST#${testPostId}`,
                SK: `METADATA`,
                GSI1PK: `USER#${testUserId}`,
                GSI1SK: `POST#${new Date().toISOString()}`,
                postId: testPostId,
                authorId: testUserId,
                content: "Test post for interactions",
                createdAt: new Date().toISOString(),
                likesCount: 0,
                commentsCount: 0,
                sharesCount: 0
            }
        }));

        const jwtSecretKey = process.env.JWT_SECRET_KEY as string || 'test_secret';
        authToken = jwt.sign({ sub: testUserId, email: user.email }, jwtSecretKey);
    });

    afterAll(async () => {
        await prisma.user.deleteMany({
            where: { email: 'test_interaction@kikiri.com' }
        });

        // Cleanup DynamoDB
        const result = await docClient.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: "PK = :pk OR GSI1PK = :upk",
            ExpressionAttributeValues: { 
                ":pk": `POST#${testPostId}`,
                ":upk": `USER#${testUserId}`
            }
        }));

        for (const item of result.Items || []) {
            await docClient.send(new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: item.PK, SK: item.SK }
            }));
        }

        await prisma.$disconnect();
    });

    it('should like a post', async () => {
        const res = await request(app)
            .post(`${config.apiBasePath}/v1/posts/${testPostId}/like`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Like agregado correctamente");
    });

    it('should add a comment', async () => {
        const res = await request(app)
            .post(`${config.apiBasePath}/v1/posts/${testPostId}/comment`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ content: "Great post!" });

        expect(res.status).toBe(201);
        expect(res.body.content).toBe("Great post!");
    });

    it('should get comments', async () => {
        const res = await request(app)
            .get(`${config.apiBasePath}/v1/posts/${testPostId}/comments`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('should share a post', async () => {
        const res = await request(app)
            .post(`${config.apiBasePath}/v1/posts/${testPostId}/share`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Post compartido/);
    });
});
