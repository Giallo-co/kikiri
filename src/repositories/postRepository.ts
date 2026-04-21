import { PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { docClient, TABLE_NAME } from "../lib/dynamo";
import { PostItem } from "../models/postModel";

export class PostRepository {
    async getAll(): Promise<PostItem[]> {
        const params = {
            TableName: TABLE_NAME,
            FilterExpression: "SK = :sk",
            ExpressionAttributeValues: {
                ":sk": "METADATA"
            }
        };

        const result = await docClient.send(new ScanCommand(params));
        return (result.Items as PostItem[]) || [];
    }

    async getByAuthor(authorId: number): Promise<PostItem[]> {
        const params = {
            TableName: TABLE_NAME,
            IndexName: "GSI1",
            KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": `USER#${authorId}`,
                ":sk": "POST#"
            },
            ScanIndexForward: false // Newest first
        };

        const result = await docClient.send(new QueryCommand(params));
        return (result.Items as PostItem[]) || [];
    }

    async save(post: { content: string; authorId: number; media?: any[] }): Promise<PostItem> {
        const postId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        const item: PostItem = {
            PK: `POST#${postId}`,
            SK: `METADATA`,
            GSI1PK: `USER#${post.authorId}`,
            GSI1SK: `POST#${timestamp}`,
            postId,
            authorId: post.authorId,
            content: post.content,
            createdAt: timestamp,
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            media: post.media
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item
        }));

        return item;
    }
}
