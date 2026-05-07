import api from './axios';
import axios from 'axios';
import { PresignedUrlResponse } from '../types';

export const storageService = {
  getPresignedUrl: async (kind: 'avatar' | 'post_audio' | 'post_image', file: File): Promise<PresignedUrlResponse> => {
    const response = await api.post('/v1/uploads/presign', {
      kind,
      contentType: file.type || 'application/octet-stream',
      contentLength: file.size,
    });
    return response.data;
  },

  getProfilePresignedUrl: async (): Promise<PresignedUrlResponse> => {
    // Some endpoints might be legacy or slightly different
    const response = await api.get('/presigned-url');
    return response.data;
  },

  uploadToS3: async (url: string, headers: Record<string, string>, file: File): Promise<void> => {
    await axios.put(url, file, {
      headers: {
        ...headers,
        'Content-Type': file.type || 'application/octet-stream',
      },
    });
  },

  confirmProfilePicture: async (userId: number, key: string): Promise<void> => {
    await api.patch(`/v1/users/${userId}/profile-picture`, { profilePictureKey: key });
  },

  confirmUploadLegacy: async (key: string): Promise<void> => {
    await api.post('/confirm', { key });
  },
};
