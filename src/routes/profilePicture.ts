import { Router, Request, Response, NextFunction } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import s3Client from "../lib/aws/s3/s3Client";
import prisma from "../lib/prisma";
import { logger } from "../lib/logger";

const router = Router();

const BUCKET = process.env.S3_BUCKET_NAME as string;
const PRESIGNED_URL_TTL_SECONDS = 300;

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

router.get("/presigned-url", async (req: Request, res: Response, next: NextFunction) => {
  try {
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
    const key = `profile-pictures/${userId}/${randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    });

    res.json({ presignedUrl, key });
  } catch (err) {
    logger.error("profile_picture_presign_failed", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    next(err);
  }
});

router.post("/confirm", async (req: Request, res: Response, next: NextFunction) => {
  try {
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

    logger.info("profile_picture_confirmed", { userId: Number(userId) });

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
  } catch (err) {
    logger.error("profile_picture_confirm_failed", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    next(err);
  }
});

export default router;