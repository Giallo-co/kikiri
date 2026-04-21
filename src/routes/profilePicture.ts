import { Router, Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import s3Client from "../lib/aws/s3/s3Client";
import prisma from "../lib/prisma";

const router = Router();

const BUCKET = process.env.S3_BUCKET_NAME as string;
const PRESIGNED_URL_TTL_SECONDS = 300;

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

router.get("/presigned-url", async (req: Request, res: Response) => {
  const { userId, contentType } = req.query as {
    userId?: string;
    contentType?: string;
  };

  if (!userId || !contentType) {
    res.status(400).json({ error: "userId and contentType are required" });
    return;
  }

  if (!ALLOWED_CONTENT_TYPES[contentType]) {
    res.status(400).json({ error: "Content type not allowed" });
    return;
  }

  const ext = ALLOWED_CONTENT_TYPES[contentType];
  const key = `profile-pictures/${userId}/${uuidv4()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_TTL_SECONDS,
  });

  res.json({ presignedUrl, key });
});

router.post("/confirm", async (req: Request, res: Response) => {
  const { userId, key, contentType, size, originalName } = req.body as {
    userId?: number;
    key?: string;
    contentType?: string;
    size?: number;
    originalName?: string;
  };

  if (!userId || !key) {
    res.status(400).json({ error: "userId and key are required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await prisma.user.update({
    where: { id: Number(userId) },
    data: { profilePictureKey: key },
  });

  const s3Url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  res.json({
    success: true,
    message: "Profile picture updated successfully",
    data: {
      userId,
      key,
      s3Url,
      contentType,
      size,
      originalName,
    },
  });
});

export default router;