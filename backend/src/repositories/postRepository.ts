import { Post } from '../models/postModel';

export class PostRepository {
    private posts: Post[] = [];
  
    async getAll(): Promise<Post[]> {
      return this.posts;
    }
  
    async getByAuthor(authorId: number): Promise<Post[]> {
      return this.posts.filter(p => p.authorId === authorId);
    }
  
    async save(post: Post): Promise<Post> {
      this.posts.push(post);
      return post;
    }
}