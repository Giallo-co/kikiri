import { PostRepository } from '../repositories/postRepository';
import { UserRepository } from '../repositories/userRepository';
import { ServiceException } from '../errors/ServiceException';
import { FeedResponse, FeedItem } from '../models/feedModel';

export class FeedService {
  constructor(
    private postRepository: PostRepository,
    private userRepository: UserRepository
  ) {}

  async generateFeed(userId: number): Promise<FeedResponse> {
    await this.ensureUserExists(userId);

    const posts = await this.postRepository.getAll();

    const items: FeedItem[] = posts
      .slice(0, 10)
      .map(post => ({
        ...post
      }));

    return {
      userId,
      items
    };
  }

  private async ensureUserExists(userId: number): Promise<void> {
    const user = await this.userRepository.getById(userId);

    if (!user) {
      throw new ServiceException(1100, 'User not found');
    }
  }
}