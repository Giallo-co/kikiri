export interface Node {
  node_id: number;
  node_type: string;
  node_name: string;
  node_color: string;

  node_music_links_next: number[];
  node_music_links_previous: number[];

  node_tag_links_next: number[];
  node_tag_links_previous: number[];

  node_author_links_next: number[];
  node_author_links_previous: number[];

  node_album_links_next: number[];
  node_album_links_previous: number[];

  [key: string]: any;
}
