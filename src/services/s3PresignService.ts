import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import s3Client from '../lib/s3Client';
import config from '../config/config';
import { ServiceException } from '../errors/ServiceException';

export type UploadKind = 'avatar' | 'post_audio' | 'post_image' | 'album_cover' | 'album_track';

const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const POST_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/ogg',
]);
/** Pistas subidas como álbum: incluye contenedor MP4 (vídeo con pista de audio). */
const ALBUM_TRACK_AUDIO_TYPES = new Set([...POST_AUDIO_TYPES, 'video/mp4']);
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
    'audio/ogg': 'ogg',
    'video/mp4': 'mp4',
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
  if (kind === 'album_cover' && !POST_IMAGE_TYPES.has(contentType)) {
    throw new ServiceException(4011, 'Invalid Content-Type for album cover upload.');
  }
  if (kind === 'album_track' && !ALBUM_TRACK_AUDIO_TYPES.has(contentType)) {
    throw new ServiceException(4012, 'Invalid Content-Type for album track upload.');
  }
}

export interface AlbumPresignContext {
  userSlug: string;
  albumSlug: string;
  trackIndex?: number;
  trackNameSlug?: string;
}

function buildKey(
  kind: UploadKind,
  userId: number,
  contentType: string,
  albumCtx?: AlbumPresignContext
): string {
  const ext = extensionForContentType(contentType);
  const id = randomUUID();
  if (kind === 'avatar') {
    return `img/users/pictures/${userId}/avatar-${id}.${ext}`;
  }
  if (kind === 'post_audio') {
    return `img/posts/audio/${userId}/audio-${id}.${ext}`;
  }
  if (kind === 'post_image') {
    return `img/posts/images/${userId}/image-${id}.${ext}`;
  }
  if (!albumCtx) {
    throw new ServiceException(5003, 'Album presign context is required for album uploads.');
  }
  const { userSlug, albumSlug } = albumCtx;
  if (kind === 'album_cover') {
    return `music-cover/${userSlug}/${albumSlug}.${ext}`;
  }
  if (kind === 'album_track') {
    const idx = albumCtx.trackIndex;
    const trackSlug = albumCtx.trackNameSlug;
    if (idx === undefined || !Number.isFinite(idx) || idx < 1) {
      throw new ServiceException(4013, 'trackIndex must be a positive integer for album_track.');
    }
    if (!trackSlug) {
      throw new ServiceException(4014, 'trackName is required for album_track presign.');
    }
    return `music/${userSlug}/${albumSlug}/${idx}-${trackSlug}.${ext}`;
  }
  throw new ServiceException(5004, `Unsupported upload kind: ${kind}`);
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
    contentLength?: number,
    albumCtx?: AlbumPresignContext
  ): Promise<PresignResult> {
    assertBucketConfigured();
    validateContentType(kind, contentType);

    if ((kind === 'album_cover' || kind === 'album_track') && !albumCtx) {
      throw new ServiceException(4015, 'albumName-derived slugs are required for album uploads.');
    }

    const key = buildKey(kind, userId, contentType, albumCtx);

    const commandInput: ConstructorParameters<typeof PutObjectCommand>[0] = {
      Bucket: config.s3BucketName,
      Key: key,
      ContentType: contentType,
    };
    if (contentLength !== undefined && Number.isFinite(contentLength) && contentLength > 0) {
      commandInput.ContentLength = Math.floor(contentLength);
    }

    const command = new PutObjectCommand(commandInput);
    const url = await getSignedUrl(s3Client, command, { expiresIn: 15 * 60 });

    const headers: Record<string, string> = {
      'Content-Type': contentType,
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
      key,
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

  static isAlbumCoverKeyForUser(key: string, userSlug: string): boolean {
    return key.startsWith(`music-cover/${userSlug}/`);
  }

  static isAlbumTrackKeyForUser(key: string, userSlug: string, albumSlug: string): boolean {
    return key.startsWith(`music/${userSlug}/${albumSlug}/`);
  }
}
