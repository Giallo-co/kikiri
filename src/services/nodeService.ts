import { PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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

  public async scanAllNodes(): Promise<any[]> {
    const items: any[] = [];
    let ExclusiveStartKey: any;
    do {
      const res = await docClient.send(
        new ScanCommand({
          TableName: NODE_TABLE_NAME,
          ExclusiveStartKey,
        })
      );
      if (res.Items?.length) items.push(...res.Items);
      ExclusiveStartKey = res.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
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
  }): Promise<MusicNode> {
    const nodeId = await this.getNextNodeId();
    const musicId = String(nodeId);

    const node: MusicNode = {
      node_id: nodeId,
      node_type: "Music",
      node_name: input.trackName,
      node_color: "#636363",
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

  public async toggleLike(username: string, musicNodeId: number): Promise<void> {
    const items = await docClient.send(
      new ScanCommand({
        TableName: NODE_TABLE_NAME,
        FilterExpression: "node_type = :type AND (node_name = :name OR author_name = :name)",
        ExpressionAttributeValues: {
          ":type": "Author",
          ":name": username,
        },
      })
    );

    const userNode = items.Items?.[0];
    if (!userNode) throw new Error("User node not found");

    const likes = (userNode.node_music_likes || []) as number[];
    const isLiked = likes.includes(musicNodeId);
    
    let newLikes;
    if (isLiked) {
      newLikes = likes.filter(id => id !== musicNodeId);
    } else {
      newLikes = [...likes, musicNodeId];
    }

    await docClient.send(
      new UpdateCommand({
        TableName: NODE_TABLE_NAME,
        Key: { node_id: userNode.node_id },
        UpdateExpression: "SET node_music_likes = :likes",
        ExpressionAttributeValues: {
          ":likes": newLikes,
        },
      })
    );
  }

  public async updateNode(nodeId: number, data: any): Promise<void> {
    const fields = Object.entries(data).filter(([_, v]) => v !== undefined);
    if (fields.length === 0) return;

    const names: Record<string, string> = {};
    const values: Record<string, any> = {};
    const parts: string[] = [];

    fields.forEach(([k, v]) => {
      names[`#${k}`] = k;
      values[`:${k}`] = v;
      parts.push(`#${k} = :${k}`);
    });

    await docClient.send(
      new UpdateCommand({
        TableName: NODE_TABLE_NAME,
        Key: { node_id: nodeId },
        UpdateExpression: `SET ${parts.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    );
  }
}
