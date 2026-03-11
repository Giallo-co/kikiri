import { Post } from "./postModel";

export interface FeedItem extends Post {
  score?: number;
}

export interface FeedResponse {
    userId: number;
    items: FeedItem[];
}