import { PostRepository } from '../repositories/postRepository';
import { UserRepository } from '../repositories/userRepository';
import { FeedResponse } from '../models/feedModel';
import { EnrichedPost } from '../models/postModel';

export class FeedService {
  constructor(
    private postRepository: PostRepository,
    private userRepository: UserRepository
  ) {}

  async generateFeed(userId: number): Promise<FeedResponse> {
    // 1. Obtener los posts de DynamoDB
    const posts = await this.postRepository.getAll();
    
    if (posts.length === 0) {
        return { userId, items: [] };
    }

    // 2. Extraer IDs de autores únicos
    const authorIds = [...new Set(posts.map(post => post.authorId))];

    // 3. Consultar perfiles (Stitching)
    const users = await this.userRepository.findByIds(authorIds);

    // 4. Crear un diccionario para acceso rapido O(1)
    const userMap = new Map(users.map(u => [u.id, u]));

    // 5. Ensamblar los datos
    const enrichedPosts: EnrichedPost[] = posts.map(post => {
      const authorData = userMap.get(post.authorId);
      return {
        postId: post.postId,
        authorId: post.authorId,
        content: post.content,
        createdAt: post.createdAt,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        sharesCount: post.sharesCount,
        author: {
          username: authorData?.username || "Usuario Desconocido",
          avatarUrl: authorData?.profile?.avatarUrl || null
        }
      };
    });

    return {
      userId,
      items: enrichedPosts.slice(0, 10)
    };
  }

}
