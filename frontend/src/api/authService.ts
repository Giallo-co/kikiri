import api from './axios';
import type { AuthResponse, User } from '../types';

export const authService = {
  register: async (data: any): Promise<AuthResponse> => {
    const response = await api.post('/v1/register', data);
    return response.data;
  },

  login: async (data: any): Promise<AuthResponse> => {
    // Assuming /v1/login exists based on standard practices, although not explicitly in endpoints.md
    // If not, I'll adjust. The prompt mentioned "Formularios de registro y login".
    const response = await api.post('/v1/login', data);
    return response.data;
  },

  getProfile: async (id: number): Promise<User> => {
    const response = await api.get(`/v1/users/id/${id}`);
    return response.data;
  },

  getProfileByEmail: async (email: string): Promise<User> => {
    const response = await api.get(`/v1/users/email/${email}`);
    return response.data;
  },

  updateProfile: async (id: number, data: any): Promise<User> => {
    const response = await api.put(`/v1/users/${id}`, data);
    return response.data;
  },

  deleteAccount: async (id: number): Promise<void> => {
    await api.delete(`/v1/users/${id}`);
  },
};
