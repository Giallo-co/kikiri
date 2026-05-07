import config from '../config/config';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client from '../lib/s3Client';

export function objectPublicUrl(key: string | null | undefined): string | undefined {
  if (!key || !config.s3PublicBaseUrl) return undefined;
  const base = config.s3PublicBaseUrl.replace(/\/$/, '');
  const k = key.replace(/^\//, '');
  return `${base}/${k}`;
}

export async function objectReadUrl(key: string | null | undefined): Promise<string | undefined> {
  if (!key) return undefined;
  const k = key.replace(/^\//, '');

  if (config.s3BucketName) {
    const command = new GetObjectCommand({
      Bucket: config.s3BucketName,
      Key: k
    });
    return getSignedUrl(s3Client, command, { expiresIn: 60 * 60 });
  }

  return objectPublicUrl(k);
}
