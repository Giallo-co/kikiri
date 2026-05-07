import api from './axios';
import type { Post, Comment } from '../types';

export const postService = {
  getFeed: async (userId: number): Promise<Post[]> => {
    const response = await api.get(`/v1/feed/${userId}`);
    return response.data;
  },

  getUserPosts: async (userId: number): Promise<Post[]> => {
    const response = await api.get(`/v1/user-posts/${userId}`);
    return Array.isArray(response.data?.posts) ? response.data.posts : [];
  },

  createPost: async (data: { title: string; body: string; audioKey: string; imageKeys?: string[] }): Promise<Post> => {
    const response = await api.post('/v1/user-posts', data);
    return response.data.post;
  },

  likePost: async (postId: number): Promise<void> => {
    await api.post(`/v1/posts/${postId}/like`);
  },

  unlikePost: async (postId: number): Promise<void> => {
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

  sharePost: async (postId: number): Promise<void> => {
    await api.post(`/v1/posts/${postId}/share`);
  },

  searchPosts: async (query: string): Promise<Post[]> => {
    const response = await api.get('/v1/search/posts', { params: { q: query } });
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },
};
