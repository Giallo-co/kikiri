import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search_by_nameid';
import { UserRepository } from '../repositories/userRepository';
import { PostRepository } from '../repositories/postRepository';
import { objectReadUrl } from '../utils/mediaUrls';
import type { EnrichedPost } from '../models/postModel';

export class SearchController {
  private readonly searchService: SearchService;
  private readonly userRepository: UserRepository;
  private readonly postRepository: PostRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.postRepository = new PostRepository();
    this.searchService = new SearchService(this.userRepository);
  }

  public async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q ?? '').trim();
      if (!q) {
        return res.json({ data: [], total: 0, page: 1, limit: 20 }); // esto deberia devolver nada si no se busca nada (si no se meten caracteres a buscar)
      }

      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Number(req.query.limit ?? 20));

      const result = await this.searchService.searchUsers(q, page, limit);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const idOrPublicId = String(req.params.id);
      const user = await this.searchService.getUserByIdOrPublicId(idOrPublicId);

      if (!user) return res.status(404).json({ message: 'User not found' });

      return res.json(user);
    } catch (error) {
      next(error);
    }
  }
  public async searchPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q ?? '').trim();
      if (!q) {
        return res.json({ data: [], total: 0 });
      }
      const lowered = q.toLowerCase();
      const posts = await this.postRepository.getAll();
      const filteredPosts = posts
        .filter((post) => post.content.toLowerCase().includes(lowered))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const users = await this.userRepository.findByIds([...new Set(filteredPosts.map((post) => post.authorId))]);
      const userMap = new Map(users.map((u) => [u.id, u]));

      const enrichedPosts: EnrichedPost[] = await Promise.all(
        filteredPosts.map(async (post) => {
          const authorData = userMap.get(post.authorId);
          const profilePictureUrl = await objectReadUrl(authorData?.profilePictureKey as string | undefined);
          const imageKeys = (post.media ?? []).filter((m) => m.type === 'image').map((m) => m.url);
          const audioKey = (post.media ?? []).find((m) => m.type === 'audio')?.url;
          const imageUrls = (await Promise.all(imageKeys.map((key) => objectReadUrl(key)))).filter(
            (url): url is string => Boolean(url)
          );
          const audioUrl = await objectReadUrl(audioKey);
          const enriched: EnrichedPost = {
            postId: post.postId,
            authorId: post.authorId,
            content: post.content,
            createdAt: post.createdAt,
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            sharesCount: post.sharesCount,
            author: {
              username: authorData?.username || 'Usuario Desconocido',
              avatarUrl: profilePictureUrl || null
            }
          };
          if (imageUrls.length > 0) {
            enriched.imageUrls = imageUrls;
          }
          if (audioUrl) {
            enriched.audioUrl = audioUrl;
          }
          return enriched;
        })
      );

      return res.json({ data: enrichedPosts, total: enrichedPosts.length });
    } catch (error) {
      next(error);
    }
  }
}
