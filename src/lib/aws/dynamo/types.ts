export interface UserPost {
  PK: string;
  SK: string;
  title?: string;
  content?: string;
  status?: string;
  tags?: string[];
  updatedOn?: number;
  ttl?: number;
  [key: string]: unknown;
}
