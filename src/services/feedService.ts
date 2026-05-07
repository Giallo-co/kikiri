import { PostRepository } from '../repositories/postRepository';
import { UserRepository } from '../repositories/userRepository';
import { EnrichedPost } from '../models/postModel';
import { FeedResponse } from '../models/feedModel';
import { objectReadUrl } from '../utils/mediaUrls';

export class FeedService {
  constructor(
    private postRepository: PostRepository,
    private userRepository: UserRepository
  ) {}

  async generateFeed(userId: number): Promise<FeedResponse> {
    const followingIds = await this.userRepository.getFollowingIds(userId);
    const authorIds = Array.from(new Set(followingIds));
    if (authorIds.length === 0) {
      return { userId, items: [] };
    }
    const postsByAuthor = await Promise.all(authorIds.map((authorId) => this.postRepository.getByAuthor(authorId)));
    const posts = postsByAuthor
      .flat()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (posts.length === 0) {
        return { userId, items: [] };
    }

    const users = await this.userRepository.findByIds([...new Set(posts.map(post => post.authorId))]);
    const userMap = new Map(users.map(u => [u.id, u]));

    const enrichedPosts: EnrichedPost[] = await Promise.all(posts.map(async (post) => {
      const authorData = userMap.get(post.authorId);
      const profilePictureUrl = await objectReadUrl(authorData?.profilePictureKey as string | undefined);
      const imageKeys = (post.media ?? []).filter((m) => m.type === 'image').map((m) => m.url);
      const audioKey = (post.media ?? []).find((m) => m.type === 'audio')?.url;
      const imageUrls = (await Promise.all(imageKeys.map((key) => objectReadUrl(key)))).filter(
        (url): url is string => Boolean(url)
      );
      const audioUrl = await objectReadUrl(audioKey);
      const author: EnrichedPost['author'] = {
        username: authorData?.username || "Usuario Desconocido",
        avatarUrl: profilePictureUrl || null
      };
      const enriched: EnrichedPost = {
        postId: post.postId,
        authorId: post.authorId,
        content: post.content,
        createdAt: post.createdAt,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        sharesCount: post.sharesCount,
        author
      };
      if (imageUrls.length > 0) {
        enriched.imageUrls = imageUrls;
      }
      if (audioUrl) {
        enriched.audioUrl = audioUrl;
      }
      return enriched;
    }));

    return {
      userId,
      items: enrichedPosts
    };
  }

}
