export interface Post {
    id: number;
    authorId: number;
    content: string;
    createdAt: Date;
    likesCount: number; 
    sharesCount: number; 
}

export interface Comment {
    id: number;
    content: string;
    createdAt: Date;
    userId: number;
    postId: number;
}

export interface Like {
    userId: number;
    postId: number;
    createdAt: Date;
}

export interface Share {
    userId: number;
    postId: number;
    createdAt: Date;
}