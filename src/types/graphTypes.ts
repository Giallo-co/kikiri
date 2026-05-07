export type NodeType = 'Author' | 'Music' | 'Tag';

export interface BaseNode {
  node_id: string; // Partition Key en DynamoDB
  node_type: NodeType;
  node_name: string;
  node_color: string;
  
  // Aristas (Adjacency Lists)
  node_music_links_next: string[];
  node_music_links_previous: string[];
  node_tag_links_next: string[];
  node_tag_links_previous: string[];
  node_author_links_next: string[];
  node_author_links_previous: string[];
  node_album_links_next: string[];
  node_album_links_previous: string[];
}

export interface AuthorNode extends BaseNode {
  node_type: 'Author';
  author_id: string;
  author_name: string;
  author_real_name: string;
  author_description: string;
  author_profile_picture: string; // Guardará la URL pública de S3
  node_music_likes: string[];
}

export interface MusicNode extends BaseNode {
  node_type: 'Music';
  music_id: string;
  music_name: string;
  music_description: string;
  music_author: string;
  music_cover_url: string; // Guardará la URL pública de S3
  music_url: string;       // Guardará la URL pública de S3
  music_album: string;
  likes: number;
  views: number;
  shares: number;
  comments: number;
}

export interface TagNode extends BaseNode {
  node_type: 'Tag';
}
