import api from './axios';
import type { User } from '../types';

export const userService = {
  followUser: async (userId: number, targetId: number): Promise<void> => {
    await api.post(`/v1/users/${userId}/follow/${targetId}`);
  },

  unfollowUser: async (userId: number, targetId: number): Promise<void> => {
    await api.delete(`/v1/users/${userId}/follow/${targetId}`);
  },

  getFollowing: async (userId: number): Promise<Array<Pick<User, 'id'>>> => {
    const response = await api.get(`/v1/users/${userId}/following`);
    const followingIds = Array.isArray(response.data?.following) ? response.data.following : [];
    return followingIds.map((id: number) => ({ id }));
  },

  searchUsers: async (query: string): Promise<User[]> => {
    const response = await api.get('/v1/search/users', { params: { q: query } });
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },
};
