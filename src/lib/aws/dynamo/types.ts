export interface UserPost {
  userId: string;
  createdOn: number;
  title?: string;
  content?: string;
  status?: string;
  tags?: string[];
  updatedOn?: number;
  [key: string]: unknown;
}
