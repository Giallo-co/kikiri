import { TransactWriteCommand, PutCommand, GetCommand, QueryCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { docClient, TABLE_NAME } from "../lib/dynamo";
import prisma from '../lib/prisma';

export class InteractionRepository {
  async addLike(userId: number, postId: string) {
    const timestamp = new Date().toISOString();
    return await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `POST#${postId}`,
              SK: `LIKE#${userId}`,
              GSI1PK: `USER#${userId}`,
              GSI1SK: `LIKE#${timestamp}`,
              userId,
              postId,
              createdAt: timestamp
            },
            ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
          }
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: `POST#${postId}`, SK: "METADATA" },
            UpdateExpression: "SET likesCount = if_not_exists(likesCount, :zero) + :inc",
            ExpressionAttributeValues: { ":inc": 1, ":zero": 0 }
          }
        }
      ]
    }));
  }

  async removeLike(userId: number, postId: string) {
    return await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PK: `POST#${postId}`,
              SK: `LIKE#${userId}`
            },
            ConditionExpression: "attribute_exists(PK)"
          }
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: `POST#${postId}`, SK: "METADATA" },
            UpdateExpression: "SET likesCount = likesCount - :inc",
            ConditionExpression: "likesCount > :zero",
            ExpressionAttributeValues: { ":inc": 1, ":zero": 0 }
          }
        }
      ]
    }));
  }

  async checkUserLikedPost(userId: number, postId: string) {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `POST#${postId}`,
        SK: `LIKE#${userId}`
      }
    }));
    return !!result.Item;
  }

  async addComment(userId: number, postId: string, content: string) {
    const commentId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // We need to increment commentsCount too
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `POST#${postId}`,
              SK: `COMMENT#${timestamp}#${commentId}`,
              commentId,
              postId,
              userId,
              content,
              createdAt: timestamp
            }
          }
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: `POST#${postId}`, SK: "METADATA" },
            UpdateExpression: "SET commentsCount = if_not_exists(commentsCount, :zero) + :inc",
            ExpressionAttributeValues: { ":inc": 1, ":zero": 0 }
          }
        }
      ]
    }));

    // For returning enriched data, we need to stitch with Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, profile: { select: { avatarUrl: true } } }
    });

    return {
      commentId,
      postId,
      userId,
      content,
      createdAt: timestamp,
      user
    };
  }

  async getCommentsByPost(postId: string) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `POST#${postId}`,
        ":sk": "COMMENT#"
      },
      ScanIndexForward: false // Newest first
    }));

    const comments = result.Items || [];
    if (comments.length === 0) return [];

    // Stitching with Prisma
    const userIds = [...new Set(comments.map(c => c.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, profile: { select: { avatarUrl: true } } }
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return comments.map(c => ({
      ...c,
      user: userMap.get(c.userId)
    }));
  }

  async addShare(userId: number, postId: string) {
    const timestamp = new Date().toISOString();
    return await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `POST#${postId}`,
              SK: `SHARE#${userId}`,
              userId,
              postId,
              createdAt: timestamp
            }
          }
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: `POST#${postId}`, SK: "METADATA" },
            UpdateExpression: "SET sharesCount = if_not_exists(sharesCount, :zero) + :inc",
            ExpressionAttributeValues: { ":inc": 1, ":zero": 0 }
          }
        }
      ]
    }));
  }

  async checkUserSharedPost(userId: number, postId: string) {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `POST#${postId}`,
        SK: `SHARE#${userId}`
      }
    }));
    return !!result.Item;
  }

  async getCommentById(postId: string, commentId: string) {
    return null; 
  }

  async deleteComment(postId: string, commentId: string, timestamp: string) {
    return await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: {
              PK: `POST#${postId}`,
              SK: `COMMENT#${timestamp}#${commentId}`
            }
          }
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: `POST#${postId}`, SK: "METADATA" },
            UpdateExpression: "SET commentsCount = commentsCount - :inc",
            ConditionExpression: "commentsCount > :zero",
            ExpressionAttributeValues: { ":inc": 1, ":zero": 0 }
          }
        }
      ]
    }));
  }
}
