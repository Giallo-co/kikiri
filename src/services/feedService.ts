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
    // se pasa el userId para hacerlo personalizado a futuro
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

}