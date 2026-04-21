import { Request, Response, NextFunction } from 'express';
import { S3PresignService, UploadKind } from '../services/s3PresignService';
import { getAuthUserId } from '../utils/authRequest';

const KINDS = new Set<UploadKind>(['avatar', 'post_audio', 'post_image']);

export class UploadController {
  constructor(private readonly s3PresignService: S3PresignService) {}

  presign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      if (userId === undefined) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { kind, contentType, contentLength } = req.body as {
        kind?: string;
        contentType?: string;
        contentLength?: number;
      };

      if (!kind || !KINDS.has(kind as UploadKind)) {
        return res.status(400).json({ message: 'kind must be avatar, post_audio, or post_image' });
      }
      if (!contentType || typeof contentType !== 'string') {
        return res.status(400).json({ message: 'contentType is required' });
      }

      const result = await this.s3PresignService.createPresignedPut(
        userId,
        kind as UploadKind,
        contentType.trim(),
        typeof contentLength === 'number' ? contentLength : undefined
      );

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
