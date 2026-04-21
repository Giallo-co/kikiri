import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import { docClient } from '../../lib/dynamo';
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import jwt from 'jsonwebtoken';
import config from '../../config/config';
import crypto from 'crypto';

const TABLE_NAME = "KikiriSocial";

describe('Feed API Integration', () => {
  let authToken: string;
  let testUserId: number;
  let testPostId: string;

  beforeAll(async () => {
    // 1. Creamos un usuario en la BD para probar
    const user = await prisma.user.create({
      data: {
        email: 'test_feed@kikiri.com',
        username: 'feed_tester',
        password: 'password123',
        role: 1
      }
    });
    testUserId = user.id;

    // 2. Creamos un post en DynamoDB
    testPostId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
            PK: `POST#${testPostId}`,
            SK: `METADATA`,
            GSI1PK: `USER#${testUserId}`,
            GSI1SK: `POST#${timestamp}`,
            postId: testPostId,
            authorId: testUserId,
            content: "Integration test post",
            createdAt: timestamp,
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0
        }
    }));

    // 3. Generamos un token válido para este usuario
    const jwtSecretKey = process.env.JWT_SECRET_KEY as string || 'test_secret'; 
    authToken = jwt.sign(
      { sub: testUserId, email: user.email, iat: Math.floor(Date.now() / 1000) }, 
      jwtSecretKey
    );
  });

  afterAll(async () => {
    // Limpiar datos
    await prisma.user.deleteMany({
      where: { email: 'test_feed@kikiri.com' }
    });

    await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
            PK: `POST#${testPostId}`,
            SK: `METADATA`
        }
    }));

    await prisma.$disconnect();
  });

  it('should return 401 if no token is provided', async () => {
    const res = await request(app).get(`${config.apiBasePath}/v1/feed/${testUserId}`);
    
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('should return 200 and a feed response when using valid token', async () => {
    const res = await request(app)
      .get(`${config.apiBasePath}/v1/feed/${testUserId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userId', testUserId);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0].postId).toBe(testPostId);
    expect(res.body.items[0].author.username).toBe('feed_tester');
  });
});
