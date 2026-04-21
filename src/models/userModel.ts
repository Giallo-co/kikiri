export interface User {
    id: number;
    publicId: string;
    email: string;
    username: string;
    password: string; 
    role: number;
    profilePictureKey?: string | null;
    profile?: Profile | null;
}

export interface Profile {
    id: number;
    bio?: string | null;
    avatarUrl?: string | null;
    userId: number;
}

export interface Follow {
    followerId: number;
    followingId: number;
    createdAt: Date;
}