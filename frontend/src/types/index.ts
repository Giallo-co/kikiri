export interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  profilePictureKey?: string | null;
  profilePictureUrl?: string | null;
  profile?: Profile;
}

export interface Profile {
  bio?: string | null;
  avatarUrl?: string | null;
  userId: number;
}

export interface Post {
  id: number;
  postId?: string;
  title: string;
  body: string;
  userId: number;
  user: User;
  audioKey?: string | null;
  audioUrl?: string;
  imageKeys: string[];
  imageUrls?: string[];
  createdAt: string;
  _count?: {
    likes: number;
    comments: number;
  };
  isLiked?: boolean;
}

export interface Comment {
  id: number;
  content: string;
  userId: number;
  postId: number;
  user: User;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PresignedUrlResponse {
  url: string;
  headers: Record<string, string>;
  key: string;
  publicUrl?: string;
}
