import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, NODE_TABLE_NAME } from "../lib/dynamo";

export interface AuthorNode {
  node_id: number;
  node_type: "Author";
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
  author_id: number;
  author_name: string;
  author_real_name: string;
  author_description: string;
  author_profile_picture: string;
  node_music_likes: number[];
}

export interface TagNode {
  node_id: number;
  node_type: "Tag";
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
  node_music_likes: number[];
}

export interface MusicNode {
  node_id: number;
  node_type: "Music";
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
  music_id: string;
  music_name: string;
  music_description: string;
  music_author: string;
  music_cover_url: string;
  music_url: string;
  music_album: string;
  likes: number;
  views: number;
  shares: number;
  comments: number;
}

export class NodeService {
  private async getNextNodeId(): Promise<number> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: NODE_TABLE_NAME,
        ProjectionExpression: "node_id",
      })
    );

    const items = result.Items || [];
    if (items.length === 0) {
      return 1;
    }

    const ids = items.map((item) => Number(item.node_id)).filter((id) => !isNaN(id));
    if (ids.length === 0) return 1;
    
    const maxId = Math.max(...ids);
    return maxId + 1;
  }

  public async createAuthorNode(authorId: number, username: string): Promise<AuthorNode> {
    const nodeId = await this.getNextNodeId();
    
    const node: AuthorNode = {
      node_id: nodeId,
      node_type: "Author",
      node_name: username,
      node_color: "#636363",
      node_music_links_next: [],
      node_music_links_previous: [],
      node_tag_links_next: [],
      node_tag_links_previous: [],
      node_author_links_next: [],
      node_author_links_previous: [],
      node_album_links_next: [],
      node_album_links_previous: [],
      author_id: authorId,
      author_name: username,
      author_real_name: "",
      author_description: "",
      author_profile_picture: "",
      node_music_likes: []
    };

    await docClient.send(
      new PutCommand({
        TableName: NODE_TABLE_NAME,
        Item: node,
        ConditionExpression: "attribute_not_exists(node_id)",
      })
    );

    return node;
  }
public async createMusicNode(input: {
  trackName: string;
  trackDescription: string;
  musicAuthor: string;
  albumName: string;
  coverUrl: string;
  audioUrl: string;
  nodeColor?: string;
}): Promise<MusicNode> {
  const nodeId = await this.getNextNodeId();
  const musicId = String(nodeId);

  const node: MusicNode = {
    node_id: nodeId,
    node_type: "Music",
    node_name: input.trackName,
    node_color: input.nodeColor || "#636363",
    node_music_links_next: [],
      node_music_links_previous: [],
      node_tag_links_next: [],
      node_tag_links_previous: [],
      node_author_links_next: [],
      node_author_links_previous: [],
      node_album_links_next: [],
      node_album_links_previous: [],
      music_id: musicId,
      music_name: input.trackName,
      music_description: input.trackDescription,
      music_author: input.musicAuthor,
      music_cover_url: input.coverUrl,
      music_url: input.audioUrl,
      music_album: input.albumName,
      likes: 0,
      views: 0,
      shares: 0,
      comments: 0,
    };

    await docClient.send(
      new PutCommand({
        TableName: NODE_TABLE_NAME,
        Item: node,
        ConditionExpression: "attribute_not_exists(node_id)",
      })
    );

    return node;
  }
}
