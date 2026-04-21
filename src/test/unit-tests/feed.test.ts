import { FeedService } from '../../services/feedService';
import { PostRepository } from '../../repositories/postRepository';
import { UserRepository } from '../../repositories/userRepository';
import { PostItem } from '../../models/postModel';

describe('FeedService', () => {
  let feedService: FeedService;
  let postRepositoryMock: Partial<PostRepository>;
  let userRepositoryMock: Partial<UserRepository>;

  beforeEach(() => {
    postRepositoryMock = {
      getAll: jest.fn(),
    };
    userRepositoryMock = {
        findByIds: jest.fn(),
    };

    feedService = new FeedService(
      postRepositoryMock as PostRepository,
      userRepositoryMock as UserRepository
    );
  });

  it('should return a feed with first 10 posts and enriched author data', async () => {
    const posts: PostItem[] = Array.from({ length: 12 }).map((_, idx) => ({
      PK: `POST#${idx}`,
      SK: 'METADATA',
      postId: `uuid-${idx}`,
      authorId: 100 + idx,
      content: `post-${idx + 1}`,
      createdAt: new Date(`2020-01-${String(idx + 1).padStart(2, '0')}T00:00:00.000Z`).toISOString(),
      likesCount: idx,
      commentsCount: 0,
      sharesCount: 0,
    }));

    const users = posts.map(p => ({
        id: p.authorId,
        username: `user-${p.authorId}`,
        profile: { avatarUrl: `http://avatar.com/${p.authorId}` }
    }));

    (postRepositoryMock.getAll as jest.Mock).mockResolvedValue(posts);
    (userRepositoryMock.findByIds as jest.Mock).mockResolvedValue(users);

    const result = await feedService.generateFeed(99);

    expect(postRepositoryMock.getAll).toHaveBeenCalledTimes(1);
    expect(userRepositoryMock.findByIds).toHaveBeenCalledTimes(1);
    expect(result.userId).toBe(99);
    expect(result.items).toHaveLength(10);

    const firstItem = result.items[0];
    const firstPost = posts[0];
    if (firstItem && firstPost) {
        expect(firstItem.postId).toBe(firstPost.postId);
        expect(firstItem.author.username).toBe(`user-${firstPost.authorId}`);
    } else {
        throw new Error("Test failed: firstItem or firstPost is undefined");
    }
  });

  it('should return an empty feed when there are no posts', async () => {
    (postRepositoryMock.getAll as jest.Mock).mockResolvedValue([]);

    const result = await feedService.generateFeed(1);

    expect(result).toEqual({
      userId: 1,
      items: [],
    });
    expect(userRepositoryMock.findByIds).not.toHaveBeenCalled();
  });
});
