import { PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, NODE_TABLE_NAME } from "../lib/dynamo";
import { ServiceException } from "../errors/ServiceException";
import type { AuthorNode, MusicNode, TagNode } from "./nodeService";

export interface AlbumGraphTrackInput {
  name: string;
  description?: string;
  tag?: string;
  audioUrl: string;
}

export interface AlbumGraphPublishInput {
  albumName: string;
  generalTag?: string;
  coverUrl: string;
  tracks: AlbumGraphTrackInput[];
  nodeColor?: string;
}

function randomTagColor(): string {
  const n = Math.floor(Math.random() * 0xffffff);
  return `#${n.toString(16).padStart(6, "0")}`;
}

function splitTagString(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;]/)) {
    const t = part.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function computeGlobalMax(items: Record<string, unknown>[]): { maxNodeId: number; maxMusicId: number } {
  let maxNodeId = 0;
  let maxMusicId = 0;
  for (const it of items) {
    const nid = Number(it.node_id);
    if (Number.isFinite(nid)) maxNodeId = Math.max(maxNodeId, nid);
    if (it.node_type === "Music" && it.music_id != null) {
      const m = Number(String(it.music_id));
      if (Number.isFinite(m)) maxMusicId = Math.max(maxMusicId, m);
    }
  }
  return { maxNodeId, maxMusicId };
}

function findAuthorForUser(
  items: Record<string, unknown>[],
  username: string,
  actorId: number
): AuthorNode | undefined {
  const u = username.trim().toLowerCase();
  for (const it of items) {
    if (it.node_type !== "Author") continue;
    const name = String(it.node_name ?? "").trim().toLowerCase();
    const authorName = String(it.author_name ?? "").trim().toLowerCase();
    if (name !== u && authorName !== u) continue;
    if (Number(it.author_id) !== actorId) continue;
    return it as unknown as AuthorNode;
  }
  return undefined;
}

function existingTagIdsByLowerName(items: Record<string, unknown>[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    if (it.node_type !== "Tag") continue;
    const key = String(it.node_name ?? "").trim().toLowerCase();
    if (!key) continue;
    const id = Number(it.node_id);
    if (!Number.isFinite(id)) continue;
    if (!m.has(key)) m.set(key, id);
  }
  return m;
}

function emptyTagNode(id: number, name: string, color: string): TagNode {
  return {
    node_id: id,
    node_type: "Tag",
    node_name: name,
    node_color: color,
    node_music_links_next: [],
    node_music_links_previous: [],
    node_tag_links_next: [],
    node_tag_links_previous: [],
    node_author_links_next: [],
    node_author_links_previous: [],
    node_album_links_next: [],
    node_album_links_previous: [],
    node_music_likes: [],
  };
}

function buildMusicNode(params: {
  nodeId: number;
  authorId: number;
  authorColor: string;
  authorUsername: string;
  albumName: string;
  trackName: string;
  trackDescription: string;
  coverUrl: string;
  audioUrl: string;
  tagIds: number[];
  albumNext: number[];
  albumPrev: number[];
}): MusicNode {
  const musicId = String(params.nodeId);
  return {
    node_id: params.nodeId,
    node_type: "Music",
    node_name: params.trackName,
    node_color: params.authorColor,
    node_music_links_next: [],
    node_music_links_previous: [],
    node_tag_links_next: params.tagIds,
    node_tag_links_previous: [],
    node_author_links_next: [params.authorId],
    node_author_links_previous: [],
    node_album_links_next: params.albumNext,
    node_album_links_previous: params.albumPrev,
    music_id: musicId,
    music_name: params.trackName,
    music_description: params.trackDescription,
    music_author: params.authorUsername,
    music_cover_url: params.coverUrl,
    music_url: params.audioUrl,
    music_album: params.albumName,
    likes: 0,
    views: 0,
    shares: 0,
    comments: 0,
  };
}

async function scanAllNodeItems(): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await docClient.send(
      new ScanCommand({
        TableName: NODE_TABLE_NAME,
        ExclusiveStartKey,
      })
    );
    if (res.Items?.length) items.push(...res.Items);
    ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return items;
}

export class AlbumGraphService {
  /**
   * Creates Music nodes linked to the Author, Tags, and album prev/next chain;
   * updates Tag and Author reverse links (legacy graph behavior).
   */
  async publishGraph(actorId: number, username: string, input: AlbumGraphPublishInput): Promise<{ created: number }> {
    const albumName = (input.albumName ?? "").trim();
    const tracks = input.tracks;
    if (!albumName || tracks.length === 0) {
      throw new ServiceException(4022, "albumName and at least one track are required.");
    }

    const items = await scanAllNodeItems();
    const author = findAuthorForUser(items, username, actorId);
    if (!author) {
      throw new ServiceException(
        4042,
        "No Author node exists for this user. Register or create the author graph node first.",
        404
      );
    }

    const authorId = author.node_id;
    const authorColor = author.node_color || "#636363";
    const finalNodeColor = (input.nodeColor ?? authorColor).trim() || authorColor;
    const authorUsername = author.node_name || username;

    const { maxNodeId, maxMusicId } = computeGlobalMax(items);
    let cursor = Math.max(maxNodeId, maxMusicId) + 1;

    const tagByLower = existingTagIdsByLowerName(items);
    const generalTags = splitTagString(input.generalTag);

    type PlannedTag = { id: number; name: string; isNew: boolean };
    const plannedTags = new Map<string, PlannedTag>();

    const ensureTag = (displayName: string): number => {
      const key = displayName.trim().toLowerCase();
      if (!key) return -1;
      const existing = plannedTags.get(key);
      if (existing) return existing.id;
      const fromDb = tagByLower.get(key);
      if (fromDb !== undefined) {
        plannedTags.set(key, { id: fromDb, name: displayName.trim(), isNew: false });
        return fromDb;
      }
      const id = cursor++;
      plannedTags.set(key, { id, name: displayName.trim(), isNew: true });
      tagByLower.set(key, id);
      return id;
    };

    for (const g of generalTags) {
      ensureTag(g);
    }
    for (const tr of tracks) {
      for (const t of splitTagString(tr.tag)) {
        ensureTag(t);
      }
    }

    for (const [, p] of plannedTags) {
      if (!p.isNew) continue;
      const node = emptyTagNode(p.id, p.name, randomTagColor());
      await docClient.send(
        new PutCommand({
          TableName: NODE_TABLE_NAME,
          Item: node,
          ConditionExpression: "attribute_not_exists(node_id)",
        })
      );
    }

    const n = tracks.length;
    const musicIds: number[] = [];
    for (let i = 0; i < n; i++) {
      musicIds.push(cursor++);
    }

    const trackTagIdSets: number[][] = [];
    for (let i = 0; i < n; i++) {
      const tr = tracks[i]!;
      const mergedNames = [...generalTags, ...splitTagString(tr.tag)];
      const idSet = new Set<number>();
      for (const name of mergedNames) {
        const id = ensureTag(name);
        if (id >= 0) idSet.add(id);
      }
      trackTagIdSets.push([...idSet].sort((a, b) => a - b));
    }

    for (let i = 0; i < n; i++) {
      const tr = tracks[i]!;
      const name = (tr.name ?? "").trim();
      const desc = (tr.description ?? "").trim();
      const albumNext = i < n - 1 ? [musicIds[i + 1]!] : [];
      const albumPrev = i > 0 ? [musicIds[i - 1]!] : [];

      const node = buildMusicNode({
        nodeId: musicIds[i]!,
        authorId,
        authorColor: finalNodeColor,
        authorUsername,
        albumName,
        trackName: name,
        trackDescription: desc,
        coverUrl: input.coverUrl,
        audioUrl: tr.audioUrl,
        tagIds: trackTagIdSets[i]!,
        albumNext,
        albumPrev,
      });

      await docClient.send(
        new PutCommand({
          TableName: NODE_TABLE_NAME,
          Item: node,
          ConditionExpression: "attribute_not_exists(node_id)",
        })
      );
    }

    const tagToMusic = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const mid = musicIds[i]!;
      for (const tid of trackTagIdSets[i]!) {
        if (!tagToMusic.has(tid)) tagToMusic.set(tid, []);
        tagToMusic.get(tid)!.push(mid);
      }
    }

    for (const [tid, mids] of tagToMusic) {
      await docClient.send(
        new UpdateCommand({
          TableName: NODE_TABLE_NAME,
          Key: { node_id: tid },
          UpdateExpression:
            "SET node_music_links_next = list_append(if_not_exists(node_music_links_next, :empty), :m), " +
            "node_author_links_next = list_append(if_not_exists(node_author_links_next, :empty2), :a)",
          ExpressionAttributeValues: {
            ":empty": [],
            ":empty2": [],
            ":m": mids,
            ":a": [authorId],
          },
        })
      );
    }

    const allTagIds = [...new Set(trackTagIdSets.flat())].sort((a, b) => a - b);
    await docClient.send(
      new UpdateCommand({
        TableName: NODE_TABLE_NAME,
        Key: { node_id: authorId },
        UpdateExpression:
          "SET node_music_links_next = list_append(if_not_exists(node_music_links_next, :empty), :mus), " +
          "node_tag_links_next = list_append(if_not_exists(node_tag_links_next, :empty2), :tags)",
        ExpressionAttributeValues: {
          ":empty": [],
          ":empty2": [],
          ":mus": musicIds,
          ":tags": allTagIds,
        },
      })
    );

    return { created: n };
  }
}
