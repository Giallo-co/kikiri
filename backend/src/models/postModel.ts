export interface Post {
    id: number;
    authorId: number;
    content: string;
    createdAt: Date;
    likes: number;
}