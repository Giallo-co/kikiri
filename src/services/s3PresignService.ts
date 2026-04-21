import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import s3Client from '../lib/s3Client';
import config from '../config/config';
import { ServiceException } from '../errors/ServiceException';

export type UploadKind = 'avatar' | 'post_audio' | 'post_image';

const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const POST_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/ogg'
]);
const POST_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function extensionForContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/webm': 'webm',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/flac': 'flac',
    'audio/ogg': 'ogg'
  };
  return map[contentType] || 'bin';
}

function assertBucketConfigured(): void {
  if (!config.s3BucketName) {
    throw new ServiceException(5001, 'S3 uploads are not configured (missing S3_BUCKET_NAME).');
  }
}

function validateContentType(kind: UploadKind, contentType: string): void {
  if (kind === 'avatar' && !AVATAR_TYPES.has(contentType)) {
    throw new ServiceException(4001, 'Invalid Content-Type for avatar upload.');
  }
  if (kind === 'post_audio' && !POST_AUDIO_TYPES.has(contentType)) {
    throw new ServiceException(4002, 'Invalid Content-Type for post audio upload.');
  }
  if (kind === 'post_image' && !POST_IMAGE_TYPES.has(contentType)) {
    throw new ServiceException(4003, 'Invalid Content-Type for post image upload.');
  }
}

function buildKey(kind: UploadKind, userId: number, contentType: string): string {
  const ext = extensionForContentType(contentType);
  const id = randomUUID();
  if (kind === 'avatar') {
    return `img/users/pictures/${userId}/avatar-${id}.${ext}`;
  }
  if (kind === 'post_audio') {
    return `img/posts/audio/${userId}/audio-${id}.${ext}`;
  }
  return `img/posts/images/${userId}/image-${id}.${ext}`;
}

export interface PresignResult {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  key: string;
  publicUrl?: string;
}

export class S3PresignService {
  async createPresignedPut(
    userId: number,
    kind: UploadKind,
    contentType: string,
    contentLength?: number
  ): Promise<PresignResult> {
    assertBucketConfigured();
    validateContentType(kind, contentType);

    const key = buildKey(kind, userId, contentType);

    const commandInput: ConstructorParameters<typeof PutObjectCommand>[0] = {
      Bucket: config.s3BucketName,
      Key: key,
      ContentType: contentType
    };
    if (contentLength !== undefined && Number.isFinite(contentLength) && contentLength > 0) {
      commandInput.ContentLength = Math.floor(contentLength);
    }

    const command = new PutObjectCommand(commandInput);
    const url = await getSignedUrl(s3Client, command, { expiresIn: 15 * 60 });

    const headers: Record<string, string> = {
      'Content-Type': contentType
    };
    if (commandInput.ContentLength !== undefined) {
      headers['Content-Length'] = String(commandInput.ContentLength);
    }

    const publicUrl =
      config.s3PublicBaseUrl.length > 0
        ? `${config.s3PublicBaseUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
        : undefined;

    const result: PresignResult = {
      url,
      method: 'PUT',
      headers,
      key
    };
    if (publicUrl !== undefined) {
      result.publicUrl = publicUrl;
    }
    return result;
  }

  static isAvatarKeyForUser(key: string, userId: number): boolean {
    return key.startsWith(`img/users/pictures/${userId}/avatar-`);
  }

  static isPostAudioKeyForUser(key: string, userId: number): boolean {
    return key.startsWith(`img/posts/audio/${userId}/audio-`);
  }

  static isPostImageKeyForUser(key: string, userId: number): boolean {
    return key.startsWith(`img/posts/images/${userId}/image-`);
  }
}
