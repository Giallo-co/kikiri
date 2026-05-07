import { TransactWriteCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { docClient, TABLE_NAME } from "../lib/dynamo";
import prisma from '../lib/prisma';
import { NodeRepository } from "./nodeRepository";

export class InteractionRepository {
  private nodeRepository = new NodeRepository();

  async addLike(userId: number, nodeId: string) {
    // En la arquitectura de grafo, un like es una actualización del contador
    // y opcionalmente una arista (aunque por ahora solo usaremos contadores para compatibilidad)
    return await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { node_id: nodeId },
            UpdateExpression: "SET likes = if_not_exists(likes, :zero) + :inc",
            ExpressionAttributeValues: { ":inc": 1, ":zero": 0 }
          }
        },
        {
            Update: {
              TableName: TABLE_NAME,
              Key: { node_id: String(userId) },
              UpdateExpression: "SET node_music_likes = list_append(if_not_exists(node_music_likes, :empty_list), :nodeId)",
              ExpressionAttributeValues: { ":empty_list": [], ":nodeId": [nodeId] }
            }
        }
      ]
    }));
  }

  async removeLike(userId: number, nodeId: string) {
    // Read-modify-write para remover de la lista de likes del usuario
    const userNode = await this.nodeRepository.getNodeById(String(userId)) as any;
    if (userNode && userNode.node_music_likes) {
        const newList = userNode.node_music_likes.filter((id: string) => id !== nodeId);
        await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { node_id: String(userId) },
            UpdateExpression: "SET node_music_likes = :newList",
            ExpressionAttributeValues: { ":newList": newList }
        }));
    }

    return await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { node_id: nodeId },
      UpdateExpression: "SET likes = likes - :inc",
      ConditionExpression: "likes > :zero",
      ExpressionAttributeValues: { ":inc": 1, ":zero": 0 }
    }));
  }

  async checkUserLikedPost(userId: number, nodeId: string) {
    const userNode = await this.nodeRepository.getNodeById(String(userId)) as any;
    return userNode?.node_music_likes?.includes(nodeId) || false;
  }

  async addComment(userId: number, nodeId: string, content: string) {
    const timestamp = new Date().toISOString();
    
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { node_id: nodeId },
      UpdateExpression: "SET comments = if_not_exists(comments, :zero) + :inc",
      ExpressionAttributeValues: { ":inc": 1, ":zero": 0 }
    }));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, profile: { select: { avatarUrl: true } } }
    });

    return {
      commentId: crypto.randomUUID(),
      postId: nodeId,
      userId,
      content,
      createdAt: timestamp,
      user
    };
  }

  async getCommentsByPost(nodeId: string) {
    // En esta fase, los comentarios no se están guardando como nodos 
    // sino que se manejaban en la tabla KikiriSocial.
    // Para no perder la funcionalidad, podríamos guardarlos como nodos o 
    // simplemente devolver una lista vacía hasta implementar comentarios en el grafo.
    return [];
  }

  async addShare(userId: number, nodeId: string) {
    return await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { node_id: nodeId },
      UpdateExpression: "SET shares = if_not_exists(shares, :zero) + :inc",
      ExpressionAttributeValues: { ":inc": 1, ":zero": 0 }
    }));
  }

  async checkUserSharedPost(userId: number, nodeId: string) {
    return false; // Simplificado
  }

  async deleteComment(nodeId: string, commentId: string, timestamp: string) {
    return await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { node_id: nodeId },
      UpdateExpression: "SET comments = comments - :inc",
      ConditionExpression: "comments > :zero",
      ExpressionAttributeValues: { ":inc": 1, ":zero": 0 }
    }));
  }
}
