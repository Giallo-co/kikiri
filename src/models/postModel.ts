export interface DynamoDBItem {
    PK: string;
    SK: string;
    GSI1PK?: string;
    GSI1SK?: string;
    GSI2PK?: string;
    GSI2SK?: string;
}

export interface MediaAttachment {
    url: string;       // La URL pública o el path del bucket de S3
    type: 'image' | 'audio' | 'video'; // Para que el frontend sepa qué renderizar
    altText?: string;  // Opcional: texto alternativo para accesibilidad
}

export interface PostItem extends DynamoDBItem {
    postId: string;
    authorId: number;
    content: string;
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    media?: MediaAttachment[]; // NUEVO: Array opcional para las referencias de S3
}

export interface CommentItem extends DynamoDBItem {
    commentId: string;
    postId: string;
    authorId: number;
    content: string;
    createdAt: string;
}

export interface LikeItem extends DynamoDBItem {
    userId: number;
    postId: string;
    createdAt: string;
}

export interface FollowItem extends DynamoDBItem {
    followerId: number;
    followingId: number;
    createdAt: string;
}

// Interfaces for API responses (enriched data)
export interface EnrichedPost extends Omit<PostItem, 'PK' | 'SK' | 'GSI1PK' | 'GSI1SK'> {
    author: {
        username: string;
        avatarUrl: string | null;
        /** Resolved from SQL `profile_picture_key` + `S3_PUBLIC_BASE_URL` when set */
        profilePictureUrl?: string;
    };
}
