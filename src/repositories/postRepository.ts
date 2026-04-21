import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { docClient, TABLE_NAME } from "../lib/dynamo";
import { PostItem, MediaAttachment } from "../models/postModel";

export class PostRepository {
    async getAll(): Promise<PostItem[]> {
        const params = {
            TableName: TABLE_NAME,
            IndexName: "GSI2", // Utilizaremos este índice
            KeyConditionExpression: "GSI2PK = :pk",
            ExpressionAttributeValues: {
                ":pk": "POST"
            },
            ScanIndexForward: false, // descendente (más recientes primero)
            Limit: 50 // Límite de seguridad
        };

        const result = await docClient.send(new QueryCommand(params));
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

    async save(post: { content: string; authorId: number; media?: MediaAttachment[] }): Promise<PostItem> {
        const postId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        const item: PostItem = {
            PK: `POST#${postId}`,
            SK: `METADATA`,
            GSI1PK: `USER#${post.authorId}`,
            GSI1SK: `POST#${timestamp}`,
            // NUEVOS ATRIBUTOS PARA EL FEED GLOBAL
            GSI2PK: `POST`, 
            GSI2SK: timestamp,
            postId,
            authorId: post.authorId,
            content: post.content,
            createdAt: timestamp,
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            // Solo insertamos la propiedad 'media' si viene definida en el argumento
            ...(post.media !== undefined && { media: post.media })
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item
        }));

        return item;
    }
}
