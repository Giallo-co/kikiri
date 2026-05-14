import { Request, Response, NextFunction } from 'express';
import { S3PresignService, UploadKind, type AlbumPresignContext } from '../services/s3PresignService';
import { getAuthUserId } from '../utils/authRequest';
import { UserRepository } from '../repositories/userRepository';
import { s3SlugSegment } from '../utils/s3Slug';

const KINDS = new Set<UploadKind>([
  'avatar',
  'post_audio',
  'post_image',
  'album_cover',
  'album_track',
]);

export class UploadController {
  constructor(
    private readonly s3PresignService: S3PresignService,
    private readonly userRepository: UserRepository
  ) {}

  presign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      if (userId === undefined) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { kind, contentType, contentLength, albumName, trackIndex, trackName } = req.body as {
        kind?: string;
        contentType?: string;
        contentLength?: number;
        albumName?: string;
        trackIndex?: number;
        trackName?: string;
      };

      if (!kind || !KINDS.has(kind as UploadKind)) {
        return res.status(400).json({
          message:
            'kind must be avatar, post_audio, post_image, album_cover, or album_track',
        });
      }
      if (!contentType || typeof contentType !== 'string') {
        return res.status(400).json({ message: 'contentType is required' });
      }

      const k = kind as UploadKind;
      let albumCtx: AlbumPresignContext | undefined;

      if (k === 'album_cover' || k === 'album_track') {
        const user = await this.userRepository.findById(userId);
        if (!user?.username) {
          return res.status(404).json({ message: 'User not found' });
        }
        const albumRaw = typeof albumName === 'string' ? albumName.trim() : '';
        if (!albumRaw) {
          return res.status(400).json({ message: 'albumName is required for album uploads' });
        }
        const userSlug = s3SlugSegment(user.username);
        const albumSlug = s3SlugSegment(albumRaw);
        if (k === 'album_track') {
          const ti =
            typeof trackIndex === 'number'
              ? trackIndex
              : typeof trackIndex === 'string'
                ? parseInt(String(trackIndex), 10)
                : NaN;
          const tn = typeof trackName === 'string' ? trackName.trim() : '';
          if (!Number.isFinite(ti) || ti < 1) {
            return res.status(400).json({ message: 'trackIndex must be >= 1 for album_track' });
          }
          if (!tn) {
            return res.status(400).json({ message: 'trackName is required for album_track' });
          }
          albumCtx = {
            userSlug,
            albumSlug,
            trackIndex: ti,
            trackNameSlug: s3SlugSegment(tn),
          };
        } else {
          albumCtx = { userSlug, albumSlug };
        }
      }

      const result = await this.s3PresignService.createPresignedPut(
        userId,
        k,
        contentType.trim(),
        typeof contentLength === 'number' ? contentLength : undefined,
        albumCtx
      );

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
