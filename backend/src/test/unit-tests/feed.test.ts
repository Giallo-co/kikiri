import { FeedService } from '../../services/feedService';
import { PostRepository } from '../../repositories/postRepository';
import { UserRepository } from '../../repositories/userRepository';
import { Post } from '../../models/postModel';

const simulateExecution = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 50));

describe('FeedService', () => {
  let feedService: FeedService;
  let postRepositoryMock: Partial<PostRepository>;
  let userRepositoryMock: Partial<UserRepository>;

  beforeEach(() => {
    postRepositoryMock = {
      getAll: jest.fn(),
    };
    userRepositoryMock = {};

    feedService = new FeedService(
      postRepositoryMock as PostRepository,
      userRepositoryMock as UserRepository
    );
  });

  it('should return a feed with first 10 posts', async () => {
    await simulateExecution();

    const posts: Post[] = Array.from({ length: 12 }).map((_, idx) => ({
      id: idx + 1,
      authorId: 100 + idx,
      content: `post-${idx + 1}`,
      createdAt: new Date(`2020-01-${String(idx + 1).padStart(2, '0')}T00:00:00.000Z`),
      likes: idx,
    }));

    (postRepositoryMock.getAll as jest.Mock).mockResolvedValue(posts);

    const result = await feedService.generateFeed(99);

    expect(postRepositoryMock.getAll).toHaveBeenCalledTimes(1);
    expect(result.userId).toBe(99);
    expect(result.items).toHaveLength(10);
    expect(result.items[0]).toEqual(posts[0]);
    expect(result.items[9]).toEqual(posts[9]);
  });

  it('should return an empty feed when there are no posts', async () => {
    await simulateExecution();

    (postRepositoryMock.getAll as jest.Mock).mockResolvedValue([]);

    const result = await feedService.generateFeed(1);

    expect(result).toEqual({
      userId: 1,
      items: [],
    });
  });
});

