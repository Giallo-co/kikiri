import api from './axios';
import type { Post, Comment } from '../types';

interface FeedApiItem {
  postId: string;
  authorId: number;
  content: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  author: {
    username: string;
    avatarUrl: string | null;
  };
  imageUrls?: string[];
  audioUrl?: string;
}

interface UserPostApiRecord {
  postId: string;
  userId: string;
  createdOn: number;
  Title: string;
  Body: string;
  Images: string[];
  Audio?: string;
  imageUrls?: string[];
  audioUrl?: string;
}

export const postService = {
  getFeed: async (userId: number): Promise<Post[]> => {
    const response = await api.get(`/v1/feed/${userId}`);
    const items = Array.isArray(response.data?.items) ? (response.data.items as FeedApiItem[]) : [];
    return items.map((item) => {
      const parts = item.content.split('\n\n');
      const title = parts[0] ?? '';
      const body = parts.length > 1 ? parts.slice(1).join('\n\n') : '';
      return {
        id: Number(item.postId) || Date.parse(item.createdAt),
        postId: item.postId,
        title,
        body,
        userId: item.authorId,
        user: {
          id: item.authorId,
          username: item.author.username,
          email: '',
          role: 'user',
          profile: item.author.avatarUrl ? { userId: item.authorId, avatarUrl: item.author.avatarUrl } : undefined,
          profilePictureUrl: item.author.avatarUrl,
        },
        audioKey: item.audioUrl ?? null,
        audioUrl: item.audioUrl,
        imageKeys: [],
        imageUrls: item.imageUrls ?? [],
        createdAt: item.createdAt,
        _count: {
          likes: item.likesCount ?? 0,
          comments: item.commentsCount ?? 0,
        },
        isLiked: false,
      };
    });
  },

  getUserPosts: async (userId: number): Promise<Post[]> => {
    const response = await api.get(`/v1/user-posts/${userId}`);
    const posts = Array.isArray(response.data?.posts) ? (response.data.posts as UserPostApiRecord[]) : [];
    return posts.map((post) => ({
      id: post.createdOn,
      postId: post.postId || String(post.createdOn),
      title: post.Title,
      body: post.Body,
      userId: Number(post.userId),
      user: {
        id: Number(post.userId),
        username: '',
        email: '',
        role: 'user',
      },
      audioKey: post.Audio ?? null,
      audioUrl: post.audioUrl,
      imageKeys: Array.isArray(post.Images) ? post.Images : [],
      imageUrls: Array.isArray(post.imageUrls) ? post.imageUrls : [],
      createdAt: new Date(post.createdOn).toISOString(),
      _count: {
        likes: 0,
        comments: 0,
      },
      isLiked: false,
    }));
  },

  createPost: async (data: { title: string; body: string; audioKey: string; imageKeys?: string[] }): Promise<Post> => {
    const response = await api.post('/v1/user-posts', data);
    return response.data.post;
  },

  likePost: async (postId: string | number): Promise<void> => {
    await api.post(`/v1/posts/${postId}/like`);
  },

  unlikePost: async (postId: string | number): Promise<void> => {
    await api.delete(`/v1/posts/${postId}/like`);
  },

  getComments: async (postId: number): Promise<Comment[]> => {
    const response = await api.get(`/v1/posts/${postId}/comments`);
    return response.data;
  },

  addComment: async (postId: number, content: string): Promise<Comment> => {
    const response = await api.post(`/v1/posts/${postId}/comment`, { content });
    return response.data;
  },

  deleteComment: async (commentId: number): Promise<void> => {
    await api.delete(`/v1/comments/${commentId}`);
  },

  sharePost: async (postId: string | number): Promise<void> => {
    await api.post(`/v1/posts/${postId}/share`);
  },

  searchPosts: async (query: string): Promise<Post[]> => {
    const response = await api.get('/v1/search/posts', { params: { q: query } });
    const items = Array.isArray(response.data?.data) ? (response.data.data as FeedApiItem[]) : [];
    return items.map((item) => {
      const parts = item.content.split('\n\n');
      const title = parts[0] ?? '';
      const body = parts.length > 1 ? parts.slice(1).join('\n\n') : '';
      return {
        id: Number(item.postId) || Date.parse(item.createdAt),
        postId: item.postId,
        title,
        body,
        userId: item.authorId,
        user: {
          id: item.authorId,
          username: item.author.username,
          email: '',
          role: 'user',
          profile: item.author.avatarUrl ? { userId: item.authorId, avatarUrl: item.author.avatarUrl } : undefined,
          profilePictureUrl: item.author.avatarUrl,
        },
        audioKey: item.audioUrl ?? null,
        audioUrl: item.audioUrl,
        imageKeys: [],
        imageUrls: item.imageUrls ?? [],
        createdAt: item.createdAt,
        _count: {
          likes: item.likesCount ?? 0,
          comments: item.commentsCount ?? 0,
        },
        isLiked: false,
      };
    });
  },
};
