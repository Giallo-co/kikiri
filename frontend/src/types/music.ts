export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  category: string;
  duration: string;
  plays: string;
  accent: string;
};

export type Category = {
  id: string;
  label: string;
};

export type Playlist = {
  id: string;
  name: string;
};