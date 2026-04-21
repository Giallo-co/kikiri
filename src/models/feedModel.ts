import { EnrichedPost } from "./postModel";

export interface FeedItem extends EnrichedPost {
  score?: number;
}

export interface FeedResponse {
    userId: number;
    items: FeedItem[];
}