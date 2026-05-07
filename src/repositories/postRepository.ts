import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { docClient, TABLE_NAME } from "../lib/dynamo";
import { PostItem, MediaAttachment } from "../models/postModel";
import { NodeRepository } from "./nodeRepository";
import { NodeService } from "../services/nodeService";
import { MusicNode } from "../types/graphTypes";

export class PostRepository {
    private nodeRepository = new NodeRepository();
    private nodeService = new NodeService(this.nodeRepository);

    async getAll(): Promise<PostItem[]> {
        // En la arquitectura de grafo, obtener "todos los posts" 
        // requiere escanear por tipo 'Music'
        const result = await this.nodeRepository.getNodesByType('Music');
        
        return result.map(node => this.mapNodeToPost(node as MusicNode));
    }

    async getByAuthor(authorId: number): Promise<PostItem[]> {
        const authorNode = await this.nodeRepository.getNodeById(String(authorId));
        if (!authorNode || !authorNode.node_music_links_next) return [];

        // Para simplicidad en esta fase, devolvemos los metadatos básicos 
        // de los nodos musicales vinculados
        const musicNodes = await Promise.all(
            authorNode.node_music_links_next.map(id => this.nodeRepository.getNodeById(id))
        );

        return musicNodes
            .filter(n => n && n.node_type === 'Music')
            .map(n => this.mapNodeToPost(n as MusicNode));
    }

    async save(post: { content: string; authorId: number; media?: MediaAttachment[] }): Promise<PostItem> {
        // En la nueva arquitectura, un "Post" es un MusicNode
        const musicNode = await this.nodeService.createNode({
            node_type: 'Music',
            node_name: post.content.substring(0, 50),
            node_color: '#1db954',
            music_name: post.content.substring(0, 50),
            music_description: post.content,
            music_author: String(post.authorId),
            music_cover_url: post.media?.find(m => m.type === 'image')?.url || '',
            music_url: post.media?.find(m => m.type === 'audio')?.url || '',
            music_album: 'Post',
            likes: 0,
            views: 0,
            shares: 0,
            comments: 0
        });

        // Vincular al autor
        await this.nodeRepository.addEdgeBetweenNodes(
            String(post.authorId),
            musicNode.node_id,
            'node_music_links_next'
        );

        return this.mapNodeToPost(musicNode as MusicNode);
    }

    private mapNodeToPost(node: MusicNode): PostItem {
        return {
            PK: `POST#${node.node_id}`,
            SK: 'METADATA',
            postId: node.node_id,
            authorId: Number(node.music_author),
            content: node.music_description,
            createdAt: new Date().toISOString(), // Fallback
            likesCount: node.likes || 0,
            commentsCount: node.comments || 0,
            sharesCount: node.shares || 0,
            media: [
                ...(node.music_cover_url ? [{ url: node.music_cover_url, type: 'image' as const }] : []),
                ...(node.music_url ? [{ url: node.music_url, type: 'audio' as const }] : [])
            ]
        };
    }
}
