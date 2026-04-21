import {
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import s3Client from "./s3Client";
import { S3Object, CreateResult, UpdateResult } from "./types";

const BUCKET = process.env.S3_BUCKET_NAME as string;

async function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    stream.on("error", reject);
  });
}

async function isExpired(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({ Bucket: BUCKET, Key: key });
    const response = await s3Client.send(command);
    const expiresAt = response.Metadata?.["expires-at"];
    if (!expiresAt) return false;
    return Date.now() > parseInt(expiresAt, 10);
  } catch {
    return false;
  }
}

export async function createObject(
  key: string,
  body: string | Buffer,
  contentType: string = "application/octet-stream",
  ttlSeconds?: number
): Promise<CreateResult> {
  const metadata: Record<string, string> = {};
  if (ttlSeconds) {
    metadata["expires-at"] = String(Date.now() + ttlSeconds * 1000);
    metadata["ttl-seconds"] = String(ttlSeconds);
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });

  const response = await s3Client.send(command);
  const expiresMsg = ttlSeconds ? ` (TTL: ${ttlSeconds}s)` : "";
  console.log(`Created: s3://${BUCKET}/${key}${expiresMsg}`);
  const result: { ETag?: string; VersionId?: string } = {};
  if (response.ETag) result.ETag = response.ETag;
  if (response.VersionId) result.VersionId = response.VersionId;
  return result;
}

export async function readObject(
  key: string,
  autoDelete: boolean = true
): Promise<string | null> {
  const expired = await isExpired(key);

  if (expired) {
    console.log(`Expired: s3://${BUCKET}/${key}`);
    if (autoDelete) await deleteObject(key);
    return null;
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3Client.send(command);
  const content = await streamToString(response.Body as Readable);
  console.log(`Read: s3://${BUCKET}/${key}`);
  return content;
}

export async function getTTL(key: string): Promise<number | null> {
  try {
    const command = new HeadObjectCommand({ Bucket: BUCKET, Key: key });
    const response = await s3Client.send(command);
    const expiresAt = response.Metadata?.["expires-at"];
    if (!expiresAt) return null;
    const remaining = Math.floor((parseInt(expiresAt, 10) - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  } catch {
    return null;
  }
}

export async function listObjects(prefix: string = ""): Promise<S3Object[]> {
  const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix });
  const response = await s3Client.send(command);
  const objects: S3Object[] = (response.Contents || []).map((obj) => ({
    key: obj.Key as string,
    size: obj.Size as number,
    lastModified: obj.LastModified as Date,
  }));
  console.log(`Listed ${objects.length} object(s) in s3://${BUCKET}/${prefix}`);
  return objects;
}

export async function updateObject(
  key: string,
  newBody: string | Buffer,
  contentType: string = "application/octet-stream",
  ttlSeconds?: number
): Promise<UpdateResult> {
  const metadata: Record<string, string> = {};

  if (ttlSeconds !== undefined) {
    metadata["expires-at"] = String(Date.now() + ttlSeconds * 1000);
    metadata["ttl-seconds"] = String(ttlSeconds);
  } else {
    try {
      const head = new HeadObjectCommand({ Bucket: BUCKET, Key: key });
      const existing = await s3Client.send(head);
      if (existing.Metadata?.["expires-at"]) {
        metadata["expires-at"] = existing.Metadata["expires-at"];
        metadata["ttl-seconds"] = existing.Metadata["ttl-seconds"] ?? "";
      }
    } catch {}
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: newBody,
    ContentType: contentType,
    Metadata: metadata,
  });

  const response = await s3Client.send(command);
  console.log(`Updated: s3://${BUCKET}/${key}`);
  const result: { ETag?: string; VersionId?: string } = {};
  if (response.ETag) result.ETag = response.ETag;
  if (response.VersionId) result.VersionId = response.VersionId;
  return result;
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await s3Client.send(command);
  console.log(`Deleted: s3://${BUCKET}/${key}`);
}

export async function renameObject(oldKey: string, newKey: string): Promise<void> {
  const copyCommand = new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: `${BUCKET}/${oldKey}`,
    Key: newKey,
  });
  await s3Client.send(copyCommand);
  await deleteObject(oldKey);
  console.log(`Renamed: s3://${BUCKET}/${oldKey} -> s3://${BUCKET}/${newKey}`);
}

export async function purgeExpired(prefix: string = ""): Promise<string[]> {
  const objects = await listObjects(prefix);
  const deleted: string[] = [];

  for (const obj of objects) {
    const expired = await isExpired(obj.key);
    if (expired) {
      await deleteObject(obj.key);
      deleted.push(obj.key);
    }
  }

  console.log(`Purged ${deleted.length} expired object(s)`);
  return deleted;
}
