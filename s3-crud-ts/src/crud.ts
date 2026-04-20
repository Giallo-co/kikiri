import {
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  CopyObjectCommand,
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

export async function createObject(
  key: string,
  body: string | Buffer,
  contentType: string = "application/octet-stream"
): Promise<CreateResult> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  const response = await s3Client.send(command);
  console.log(`Created: s3://${BUCKET}/${key}`);
  return { ETag: response.ETag ?? undefined, VersionId: response.VersionId ?? undefined };
}

export async function readObject(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const response = await s3Client.send(command);
  const content = await streamToString(response.Body as Readable);
  console.log(`Read: s3://${BUCKET}/${key}`);
  return content;
}

export async function listObjects(prefix: string = ""): Promise<S3Object[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
  });
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
  contentType: string = "application/octet-stream"
): Promise<UpdateResult> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: newBody,
    ContentType: contentType,
  });
  const response = await s3Client.send(command);
  console.log(`Updated: s3://${BUCKET}/${key}`);
  return { ETag: response.ETag ?? undefined, VersionId: response.VersionId ?? undefined };
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
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
