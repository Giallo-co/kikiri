import { GetCommand, BatchGetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'crypto';
import { docClient, TABLE_NAME } from '../lib/dynamo';
import { NodeRepository } from './nodeRepository';
import { MusicNode } from '../types/graphTypes';
import config from '../config/config';

export interface UserPostRecord {
  userId: string;
  createdOn: number;
  Title: string;
  Body: string;
  Images: string[];
  Audio?: string;
  nodeId?: string;
}

export class UserPostRepository {
  private nodeRepository = new NodeRepository();

  private buildPublicUrl(key: string): string {
    return `${config.s3PublicBaseUrl}/${key}`;
  }

  async putPost(record: UserPostRecord): Promise<void> {
    const postId = crypto.randomUUID();
    const authorId = record.userId;

    const musicNode: MusicNode = {
      node_id: postId,
      node_type: 'Music',
      node_name: record.Title,
      node_color: '#1db954',
      music_id: postId,
      music_name: record.Title,
      music_description: record.Body,
      music_author: record.userId,
      music_cover_url: record.Images && record.Images.length > 0 ? this.buildPublicUrl(record.Images[0] as string) : '',
      music_url: record.Audio ? this.buildPublicUrl(record.Audio) : '',
      music_album: 'Single',
      likes: 0,
      views: 0,
      shares: 0,
      comments: 0,
      node_music_links_next: [],
      node_music_links_previous: [],
      node_tag_links_next: [],
      node_tag_links_previous: [],
      node_author_links_next: [],
      node_author_links_previous: [],
      node_album_links_next: [],
      node_album_links_previous: []
    };

    // Use transaction to create MusicNode and link to AuthorNode
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: musicNode
          }
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { node_id: authorId },
            UpdateExpression: 'SET node_music_links_next = list_append(if_not_exists(node_music_links_next, :empty_list), :new_id)',
            ExpressionAttributeNames: {
              '#edgeField': 'node_music_links_next'
            },
            ExpressionAttributeValues: {
              ':empty_list': [],
              ':new_id': [postId]
            }
          }
        }
      ].map(item => {
        // Fix for reserved words or dynamic field names if needed
        if (item.Update) {
            item.Update.UpdateExpression = item.Update.UpdateExpression!.replace('node_music_links_next', '#edgeField');
        }
        return item;
      })
    }));
  }

  async listByUserId(userId: string, limit: number = 50): Promise<UserPostRecord[]> {
    const authorNode = await this.nodeRepository.getNodeById(userId);
    if (!authorNode || !authorNode.node_music_links_next || authorNode.node_music_links_next.length === 0) {
      return [];
    }

    const musicIds = authorNode.node_music_links_next.slice(-limit); // Last ones first if we want recent
    
    // BatchGet the music nodes
    const out = await docClient.send(new BatchGetCommand({
      RequestItems: {
        [TABLE_NAME]: {
          Keys: musicIds.map(id => ({ node_id: id }))
        }
      }
    }));

    const items = (out.Responses?.[TABLE_NAME] ?? []) as MusicNode[];
    
    return items.map(item => {
      // Extract keys from absolute URLs if they were stored as such
      const getKey = (url?: string) => {
        if (!url) return '';
        const base = config.s3PublicBaseUrl.replace(/\/$/, '');
        return url.replace(`${base}/`, '');
      };

      return {
        userId: String(item.music_author),
        createdOn: Date.now(), 
        Title: item.music_name,
        Body: item.music_description,
        Images: item.music_cover_url ? [getKey(item.music_cover_url)] : [],
        Audio: getKey(item.music_url),
        nodeId: item.node_id
      };
    });
  }
}
