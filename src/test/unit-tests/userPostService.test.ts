import { UserPostService } from '../../services/userPostService';
import { UserPostRepository } from '../../repositories/userPostRepository';
import { ServiceException } from '../../errors/ServiceException';

jest.mock('../../config/config', () => ({
  __esModule: true,
  default: {
    awsRegion: 'us-east-1',
    s3BucketName: 'bucket',
    s3PublicBaseUrl: '',
    dynamodbUserPostTableName: 'userPost',
    port: 3000,
    nodeEnv: 'test',
    minPasswordLength: 8,
    apiBasePath: '/user',
    host: 'localhost',
    protocol: 'http',
    errorMessage: 'err'
  }
}));

describe('UserPostService', () => {
  const putPost = jest.fn().mockResolvedValue(undefined);
  const repo = { putPost, listByUserId: jest.fn() } as unknown as UserPostRepository;
  const service = new UserPostService(repo);

  beforeEach(() => {
    putPost.mockClear();
  });

  it('creates a post when audio key is valid', async () => {
    const view = await service.createPost(10, {
      title: 'T',
      body: 'B',
      imageKeys: [],
      audioKey: 'img/posts/audio/10/audio-abc.mp3'
    });

    expect(putPost).toHaveBeenCalledTimes(1);
    const arg = putPost.mock.calls[0][0];
    expect(arg.userId).toBe('10');
    expect(arg.Title).toBe('T');
    expect(arg.Body).toBe('B');
    expect(arg.Audio).toBe('img/posts/audio/10/audio-abc.mp3');
    expect(view.audioUrl).toBeUndefined();
  });

  it('rejects invalid audio key', async () => {
    await expect(
      service.createPost(10, {
        title: 'T',
        body: 'B',
        audioKey: 'img/posts/audio/99/audio-abc.mp3'
      })
    ).rejects.toBeInstanceOf(ServiceException);
    expect(putPost).not.toHaveBeenCalled();
  });

  it('rejects invalid image key', async () => {
    await expect(
      service.createPost(10, {
        title: 'T',
        body: 'B',
        imageKeys: ['img/posts/images/11/image-x.png'],
        audioKey: 'img/posts/audio/10/audio-abc.mp3'
      })
    ).rejects.toBeInstanceOf(ServiceException);
  });
});
