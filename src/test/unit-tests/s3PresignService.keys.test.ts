import { S3PresignService } from '../../services/s3PresignService';

describe('S3PresignService key validation', () => {
  it('accepts avatar keys for the same user', () => {
    expect(S3PresignService.isAvatarKeyForUser('img/users/pictures/12/avatar-abc.jpg', 12)).toBe(true);
  });

  it('rejects avatar keys for a different user', () => {
    expect(S3PresignService.isAvatarKeyForUser('img/users/pictures/12/avatar-abc.jpg', 99)).toBe(false);
  });

  it('accepts post audio keys for the same user', () => {
    expect(S3PresignService.isPostAudioKeyForUser('img/posts/audio/3/audio-xyz.mp3', 3)).toBe(true);
  });

  it('rejects post audio keys for a different user', () => {
    expect(S3PresignService.isPostAudioKeyForUser('img/posts/audio/3/audio-xyz.mp3', 4)).toBe(false);
  });

  it('accepts post image keys for the same user', () => {
    expect(S3PresignService.isPostImageKeyForUser('img/posts/images/7/image-q.png', 7)).toBe(true);
  });

  it('accepts album cover keys for the same user slug', () => {
    expect(S3PresignService.isAlbumCoverKeyForUser('music-cover/jane-doe/volume-alpha.jpg', 'jane-doe')).toBe(true);
  });

  it('accepts album track keys for user and album slug', () => {
    expect(
      S3PresignService.isAlbumTrackKeyForUser('music/jane-doe/volume-alpha/1-key.mp3', 'jane-doe', 'volume-alpha')
    ).toBe(true);
  });
});
