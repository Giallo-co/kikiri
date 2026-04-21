import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../lib/dynamoDocClient';
import config from '../config/config';

export interface UserPostRecord {
  userId: string;
  createdOn: number;
  Title: string;
  Body: string;
  Images: string[];
  Audio?: string;
}

export class UserPostRepository {
  private tableName(): string {
    if (!config.dynamodbUserPostTableName) {
      throw new Error('DYNAMODB_USER_POST_TABLE_NAME is not set');
    }
    return config.dynamodbUserPostTableName;
  }

  async putPost(record: UserPostRecord): Promise<void> {
    await dynamoDocClient.send(
      new PutCommand({
        TableName: this.tableName(),
        Item: {
          userId: record.userId,
          createdOn: record.createdOn,
          Title: record.Title,
          Body: record.Body,
          Images: record.Images,
          ...(record.Audio !== undefined && record.Audio !== '' ? { Audio: record.Audio } : {})
        }
      })
    );
  }

  async listByUserId(userId: string, limit: number = 50): Promise<UserPostRecord[]> {
    const out = await dynamoDocClient.send(
      new QueryCommand({
        TableName: this.tableName(),
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        ScanIndexForward: false,
        Limit: limit
      })
    );

    const items = (out.Items ?? []) as UserPostRecord[];
    return items.map((row): UserPostRecord => {
      const rec: UserPostRecord = {
        userId: String(row.userId),
        createdOn: Number(row.createdOn),
        Title: String(row.Title ?? ''),
        Body: String(row.Body ?? ''),
        Images: Array.isArray(row.Images) ? (row.Images as string[]) : []
      };
      if (row.Audio !== undefined && row.Audio !== null && String(row.Audio) !== '') {
        rec.Audio = String(row.Audio);
      }
      return rec;
    });
  }
}
