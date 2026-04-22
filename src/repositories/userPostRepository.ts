import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'crypto';
import { docClient, TABLE_NAME } from '../lib/dynamo';
import { MediaAttachment, PostItem } from '../models/postModel';

export interface UserPostRecord {
  userId: string;
  createdOn: number;
  Title: string;
  Body: string;
  Images: string[];
  Audio?: string;
}

function buildMedia(imageKeys: string[], audioKey?: string): MediaAttachment[] | undefined {
  const media: MediaAttachment[] = [];
  for (const url of imageKeys) {
    if (url) media.push({ url, type: 'image' });
  }
  if (audioKey) {
    media.push({ url: audioKey, type: 'audio' });
  }
  return media.length > 0 ? media : undefined;
}

function mapItemToRecord(item: Record<string, unknown>): UserPostRecord {
  const authorId = Number(item.authorId);
  const content = String(item.content ?? '');
  const parts = content.split('\n\n');
  const titleFromContent = parts[0] ?? '';
  const bodyFromContent = parts.length > 1 ? parts.slice(1).join('\n\n') : '';

  const title = item.Title !== undefined && item.Title !== null ? String(item.Title) : titleFromContent;
  const body = item.Body !== undefined && item.Body !== null ? String(item.Body) : bodyFromContent;

  const images = Array.isArray(item.Images) ? (item.Images as string[]) : [];

  let audio: string | undefined;
  if (item.Audio !== undefined && item.Audio !== null && String(item.Audio) !== '') {
    audio = String(item.Audio);
  } else if (Array.isArray(item.media)) {
    const m = (item.media as MediaAttachment[]).find((x) => x.type === 'audio');
    if (m?.url) audio = m.url;
  }

  const createdOnRaw = item.createdOn;
  const createdOn =
    typeof createdOnRaw === 'number' && Number.isFinite(createdOnRaw)
      ? createdOnRaw
      : Date.parse(String(item.createdAt ?? ''));

  const rec: UserPostRecord = {
    userId: String(Number.isFinite(authorId) ? authorId : ''),
    createdOn: Number.isFinite(createdOn) ? createdOn : Date.now(),
    Title: title,
    Body: body,
    Images: images
  };
  if (audio !== undefined) {
    rec.Audio = audio;
  }
  return rec;
}

export class UserPostRepository {
  /**
   * Writes into the same single-table (`KikiriSocial`) as {@link PostRepository}:
   * PK/SK + GSI1 (per-user) + GSI2 (global feed).
   */
  async putPost(record: UserPostRecord): Promise<void> {
    const postId = crypto.randomUUID();
    const authorId = parseInt(record.userId, 10);
    if (!Number.isFinite(authorId)) {
      throw new Error('Invalid userId for user post');
    }

    const timestamp = new Date(record.createdOn).toISOString();
    const media = buildMedia(record.Images, record.Audio);

    const item: PostItem & {
      Title: string;
      Body: string;
      Images: string[];
      Audio?: string;
      createdOn: number;
    } = {
      PK: `POST#${postId}`,
      SK: 'METADATA',
      GSI1PK: `USER#${authorId}`,
      GSI1SK: `POST#${timestamp}`,
      GSI2PK: 'POST',
      GSI2SK: timestamp,
      postId,
      authorId,
      content: `${record.Title}\n\n${record.Body}`,
      createdAt: timestamp,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      ...(media !== undefined ? { media } : {}),
      Title: record.Title,
      Body: record.Body,
      Images: record.Images,
      ...(record.Audio !== undefined && record.Audio !== '' ? { Audio: record.Audio } : {}),
      createdOn: record.createdOn
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      })
    );
  }

  async listByUserId(userId: string, limit: number = 50): Promise<UserPostRecord[]> {
    const authorId = parseInt(userId, 10);
    if (!Number.isFinite(authorId)) {
      return [];
    }

    const out = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${authorId}`,
          ':sk': 'POST#'
        },
        ScanIndexForward: false,
        Limit: limit
      })
    );

    const items = (out.Items ?? []) as Record<string, unknown>[];
    return items.map((row) => mapItemToRecord(row));
  }
}
