import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import { docClient } from '../../lib/dynamo';
import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import jwt from 'jsonwebtoken';
import config from '../../config/config';

const TABLE_NAME = "KikiriSocial";

describe('Friendship API Integration', () => {
    let authToken: string;
    let userId: number;
    let targetId: number;

    beforeAll(async () => {
        const user = await prisma.user.create({
            data: { email: 'f1@kikiri.com', username: 'user1', password: 'password', role: 1 }
        });
        const target = await prisma.user.create({
            data: { email: 'f2@kikiri.com', username: 'user2', password: 'password', role: 1 }
        });
        userId = user.id;
        targetId = target.id;

        const jwtSecretKey = process.env.JWT_SECRET_KEY as string || 'test_secret';
        authToken = jwt.sign({ sub: userId, email: user.email }, jwtSecretKey);
    });

    afterAll(async () => {
        await prisma.user.deleteMany({
            where: { email: { in: ['f1@kikiri.com', 'f2@kikiri.com'] } }
        });

        // Cleanup DynamoDB
        const result = await docClient.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: "followerId = :id OR followingId = :id",
            ExpressionAttributeValues: { ":id": userId }
        }));

        for (const item of result.Items || []) {
            await docClient.send(new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: item.PK, SK: item.SK }
            }));
        }

        await prisma.$disconnect();
    });

    it('should follow a user', async () => {
        const res = await request(app)
            .post(`${config.apiBasePath}/v1/users/${userId}/follow/${targetId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Successfully followed user.");
    });

    it('should get following list', async () => {
        const res = await request(app)
            .get(`${config.apiBasePath}/v1/users/${userId}/following`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.following).toContain(targetId);
    });

    it('should unfollow a user', async () => {
        const res = await request(app)
            .delete(`${config.apiBasePath}/v1/users/${userId}/follow/${targetId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Successfully unfollowed user.");
    });
});
