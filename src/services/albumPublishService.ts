import { ServiceException } from '../errors/ServiceException';
import { UserRepository } from '../repositories/userRepository';
import { AlbumGraphService } from './albumGraphService';
import { S3PresignService } from './s3PresignService';
import { objectPublicUrl } from '../utils/mediaUrls';
import config from '../config/config';
import { s3SlugSegment } from '../utils/s3Slug';

export interface AlbumTrackInput {
  name: string;
  description?: string;
  tag?: string;
  audioKey: string;
}

export interface PublishAlbumInput {
  albumName: string;
  generalTag?: string;
  coverKey: string;
  tracks: AlbumTrackInput[];
}

export class AlbumPublishService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly albumGraphService: AlbumGraphService
  ) {}

  async publishAlbum(actorId: number, input: PublishAlbumInput): Promise<{ created: number }> {
    if (!config.s3PublicBaseUrl?.trim()) {
      throw new ServiceException(5005, 'S3_PUBLIC_BASE_URL is required to publish album URLs.', 500);
    }

    const albumName = (input.albumName ?? '').trim();
    if (!albumName) {
      throw new ServiceException(4020, 'albumName is required.');
    }

    const user = await this.userRepository.findById(actorId);
    if (!user?.username) {
      throw new ServiceException(4041, 'User not found.');
    }

    const userSlug = s3SlugSegment(user.username);
    const albumSlug = s3SlugSegment(albumName);

    const coverKey = (input.coverKey ?? '').trim();
    if (!coverKey || !S3PresignService.isAlbumCoverKeyForUser(coverKey, userSlug)) {
      throw new ServiceException(4021, 'Invalid or missing coverKey for this user.');
    }

    const tracks = Array.isArray(input.tracks) ? input.tracks : [];
    if (tracks.length === 0) {
      throw new ServiceException(4022, 'At least one track is required.');
    }

    const coverUrl = objectPublicUrl(coverKey);
    if (!coverUrl) {
      throw new ServiceException(5005, 'Could not build public URL for cover.', 500);
    }

    const graphTracks: { name: string; description: string; tag: string; audioUrl: string }[] = [];
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i]!;
      const name = (t.name ?? '').trim();
      if (!name) {
        throw new ServiceException(4023, `Track ${i + 1}: name is required.`);
      }
      const audioKey = (t.audioKey ?? '').trim();
      if (!audioKey || !S3PresignService.isAlbumTrackKeyForUser(audioKey, userSlug, albumSlug)) {
        throw new ServiceException(4024, `Track ${i + 1}: invalid audioKey for this user/album.`);
      }
      const audioUrl = objectPublicUrl(audioKey);
      if (!audioUrl) {
        throw new ServiceException(5005, `Could not build public URL for track ${i + 1}.`, 500);
      }

      graphTracks.push({
        name,
        description: (t.description ?? '').trim(),
        tag: typeof t.tag === 'string' ? t.tag : '',
        audioUrl,
      });
    }

    return this.albumGraphService.publishGraph(actorId, user.username, {
      albumName,
      generalTag: input.generalTag ?? '',
      coverUrl,
      tracks: graphTracks,
    });
  }
}
