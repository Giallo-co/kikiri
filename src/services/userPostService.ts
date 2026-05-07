import { UserPostRepository, UserPostRecord } from '../repositories/userPostRepository';
import { ServiceException } from '../errors/ServiceException';
import { S3PresignService } from './s3PresignService';
import { objectReadUrl } from '../utils/mediaUrls';
import { TABLE_NAME } from '../lib/dynamo';

export interface UserPostView extends UserPostRecord {
  imageUrls: string[];
  audioUrl?: string;
}

export class UserPostService {
  constructor(private readonly userPostRepository: UserPostRepository) {}

  private assertDynamoConfigured(): void {
    if (!TABLE_NAME) {
      throw new ServiceException(5002, 'DynamoDB is not configured (missing DYNAMODB_TABLE_NAME).');
    }
  }

  async createPost(
    actorId: number,
    input: { title: string; body: string; imageKeys?: string[]; audioKey: string }
  ): Promise<UserPostView> {
    this.assertDynamoConfigured();

    const title = (input.title ?? '').trim();
    const body = (input.body ?? '').trim();
    if (!title) throw new ServiceException(4006, 'title is required.');
    if (!body) throw new ServiceException(4007, 'body is required.');

    const audioKey = input.audioKey.trim();
    if (!audioKey) throw new ServiceException(4008, 'audioKey is required.');
    if (!S3PresignService.isPostAudioKeyForUser(audioKey, actorId)) {
      throw new ServiceException(4009, 'Invalid audioKey for this user.');
    }

    const imageKeys = input.imageKeys ?? [];
    for (const key of imageKeys) {
      if (!S3PresignService.isPostImageKeyForUser(key, actorId)) {
        throw new ServiceException(4010, 'Invalid image key for this user.');
      }
    }

    const createdOn = Date.now();
    const record: UserPostRecord = {
      postId: '',
      userId: String(actorId),
      createdOn,
      Title: title,
      Body: body,
      Images: imageKeys,
      Audio: audioKey
    };

    record.postId = await this.userPostRepository.putPost(record);
    return this.toView(record);
  }

  async listPostsForUser(requesterId: number, targetUserId: number): Promise<UserPostView[]> {
    this.assertDynamoConfigured();
    const rows = await this.userPostRepository.listByUserId(String(targetUserId));
    return Promise.all(rows.map((r) => this.toView(r)));
  }

  private async toView(record: UserPostRecord): Promise<UserPostView> {
    const imageUrls = (await Promise.all(record.Images.map((k) => objectReadUrl(k)))).filter(
      (url): url is string => Boolean(url)
    );
    const view: UserPostView = {
      ...record,
      imageUrls
    };
    const audioUrl = await objectReadUrl(record.Audio);
    if (audioUrl !== undefined) {
      view.audioUrl = audioUrl;
    }
    return view;
  }
}
