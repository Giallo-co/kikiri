import { Request, Response, NextFunction } from 'express';
import { AlbumPublishService, type AlbumTrackInput } from '../services/albumPublishService';
import { getAuthUserId } from '../utils/authRequest';

function mapTracks(raw: unknown): AlbumTrackInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => ({
    name: String((t as { name?: unknown })?.name ?? ''),
    description:
      typeof (t as { description?: unknown })?.description === 'string'
        ? (t as { description: string }).description
        : '',
    tag: typeof (t as { tag?: unknown })?.tag === 'string' ? (t as { tag: string }).tag : '',
    audioKey: String((t as { audioKey?: unknown })?.audioKey ?? ''),
  }));
}

export class AlbumController {
  constructor(private readonly albumPublishService: AlbumPublishService) {}

  publish = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = getAuthUserId(req);
      if (actorId === undefined) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { albumName, generalTag, coverKey, tracks } = req.body as {
        albumName?: string;
        generalTag?: string;
        coverKey?: string;
        tracks?: unknown;
      };

      const result = await this.albumPublishService.publishAlbum(actorId, {
        albumName: albumName ?? '',
        generalTag: typeof generalTag === 'string' ? generalTag : '',
        coverKey: typeof coverKey === 'string' ? coverKey : '',
        tracks: mapTracks(tracks),
      });

      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };
}
