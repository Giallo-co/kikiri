export interface Music {
  music_id: string;
  music_name: string;
  music_description: string;
  music_author: string;
  music_cover_url: string;
  music_url: string;
  music_album: string;
  music_genre?: string;
  music_year?: number;
  likes: number;
  views: number;
  shares: number;
  comments: number;
}
