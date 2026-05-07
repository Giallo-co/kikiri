/**
 * Graph / music "node" table API (migrated from frontend/server.ts).
 * Mounted at /api → routes are /nodes, /register, etc.
 */
import express, { type Response } from "express";
import { ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../lib/dynamo";
import { logger } from "../lib/logger";

const GRAPH_TABLE = process.env.GRAPH_NODES_TABLE_NAME || "node";

const router = express.Router();

const clients = new Set<Response>();

let lastTrack: object | null = null;

const fetchNodesFromDynamo = async (): Promise<string> => {
  try {
    const command = new ScanCommand({
      TableName: GRAPH_TABLE,
    });
    const response = await docClient.send(command);
    return JSON.stringify(response.Items || []);
  } catch (error) {
    logger.error("graph_fetch_nodes_failed", {
      message: error instanceof Error ? error.message : String(error),
      table: GRAPH_TABLE,
    });
    return "[]";
  }
};

const broadcast = (line: string) => {
  clients.forEach((res) => res.write(`data: ${line}\n\n`));
};

const broadcastTrack = (track: object) => {
  const payload = JSON.stringify({ __type: "track", track });
  clients.forEach((res) => res.write(`data: ${payload}\n\n`));
};

let lastContent = "";
setInterval(async () => {
  try {
    const current = await fetchNodesFromDynamo();
    if (current !== lastContent) {
      lastContent = current;
      broadcast(current);
    }
  } catch {
    /* ignore */
  }
}, 1000);

router.get("/nodes", async (_req, res) => {
  try {
    const nodes = await fetchNodesFromDynamo();
    res.json(JSON.parse(nodes));
  } catch {
    res.status(500).json({ error: "Failed to fetch nodes from DynamoDB" });
  }
});

router.get("/nodes/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const line = await fetchNodesFromDynamo();
    lastContent = line;
    res.write(`data: ${line}\n\n`);
  } catch {
    /* ignore */
  }

  if (lastTrack) {
    const payload = JSON.stringify({ __type: "track", track: lastTrack });
    res.write(`data: ${payload}\n\n`);
  }

  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
  });
});

router.get("/current-track", (_req, res) => {
  if (lastTrack) {
    res.json(lastTrack);
  } else {
    res.status(204).end();
  }
});

router.post("/node-selected", (req, res) => {
  const { id, name, content } = req.body as {
    id?: string;
    name?: string;
    content?: { music_id?: string } & Record<string, unknown>;
  };
  logger.info("graph_node_selected", { id, name });

  if (content && content.music_id) {
    lastTrack = content;
    broadcastTrack(content);
  }

  res.sendStatus(200);
});

router.post("/like", async (req, res) => {
  const { username, musicNodeId } = req.body as { username?: string; musicNodeId?: string };
  if (!username || !musicNodeId) {
    return res.status(400).json({ error: "Username and musicNodeId are required" });
  }

  try {
    const scanCommand = new ScanCommand({
      TableName: GRAPH_TABLE,
      FilterExpression: "node_type = :type AND (node_name = :name OR author_name = :name)",
      ExpressionAttributeValues: {
        ":type": "Author",
        ":name": username,
      },
    });
    const scanResult = await docClient.send(scanCommand);
    const userNode = scanResult.Items?.[0];

    if (!userNode) {
      return res.status(404).json({ error: "User not found" });
    }

    let likes = (userNode.node_music_likes as string[]) || [];

    if (likes.includes(musicNodeId)) {
      likes = likes.filter((id: string) => id !== musicNodeId);
    } else {
      likes.push(musicNodeId);
    }

    const putCommand = new PutCommand({
      TableName: GRAPH_TABLE,
      Item: { ...userNode, node_music_likes: likes },
    });
    await docClient.send(putCommand);

    logger.info("graph_like_toggled", { username, musicNodeId });
    res.json({ message: "Success", likes });
  } catch (error) {
    logger.error("graph_like_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to update likes" });
  }
});

router.post("/profile/update", async (req, res) => {
  const { node_id, author_description, node_color, node_name, author_name } = req.body as Record<
    string,
    unknown
  >;
  if (!node_id) {
    return res.status(400).json({ error: "node_id is required" });
  }

  try {
    const scanCommand = new ScanCommand({
      TableName: GRAPH_TABLE,
      FilterExpression: "node_id = :id",
      ExpressionAttributeValues: {
        ":id": node_id,
      },
    });
    const scanResult = await docClient.send(scanCommand);
    const userNode = scanResult.Items?.[0];

    if (!userNode) {
      return res.status(404).json({ error: "Node not found" });
    }

    const updatedNode = {
      ...userNode,
      author_description:
        author_description !== undefined ? author_description : userNode.author_description,
      node_color: node_color !== undefined ? node_color : userNode.node_color,
      node_name: node_name !== undefined ? node_name : userNode.node_name,
      author_name: author_name !== undefined ? author_name : userNode.author_name,
    };

    const putCommand = new PutCommand({
      TableName: GRAPH_TABLE,
      Item: updatedNode,
    });
    await docClient.send(putCommand);

    logger.info("graph_profile_updated", { node_id });
    res.json({ message: "Success", node: updatedNode });
  } catch (error) {
    logger.error("graph_profile_update_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.post("/album/upload", async (req, res) => {
  const { albumName, authorName, coverUrl, generalTag, tracks, postedBy } = req.body as {
    albumName?: string;
    authorName?: string;
    coverUrl?: string;
    generalTag?: string;
    tracks?: Array<{ name: string; url: string; description?: string; tag?: string }>;
    postedBy?: string;
  };
  if (!albumName || !authorName || !tracks || !Array.isArray(tracks)) {
    return res.status(400).json({ error: "Album name, author name, and tracks are required" });
  }

  try {
    const scanCommand = new ScanCommand({ TableName: GRAPH_TABLE });
    const scanResult = await docClient.send(scanCommand);
    const nodes = (scanResult.Items || []) as Record<string, any>[];

    let authorNode = nodes.find(
      (n) => n.node_type === "Author" && (n.node_name === authorName || n.author_name === authorName)
    );

    if (!authorNode) {
      authorNode = nodes.find(
        (n) => n.node_type === "Author" && (n.node_name === postedBy || n.author_name === postedBy)
      );
    }

    if (!authorNode) {
      return res.status(404).json({ error: "Author node not found. Please ensure the author exists." });
    }

    const authorNodeId = authorNode.node_id as string;
    let maxNodeId = 0;
    let maxMusicId = 0;
    nodes.forEach((n) => {
      const nid = parseInt(String(n.node_id), 10);
      if (!Number.isNaN(nid) && nid > maxNodeId) maxNodeId = nid;

      const mid = parseInt(String(n.music_id), 10);
      if (!Number.isNaN(mid) && mid > maxMusicId) maxMusicId = mid;
    });

    const albumNodes: Record<string, any>[] = [];
    const tagsToUpdate: Record<string, any> = {};

    const getOrCreateTags = async (tagNamesString: string) => {
      if (!tagNamesString) return [];
      const tagNames = tagNamesString
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== "");
      const tagNodes: Record<string, any>[] = [];

      for (const tagName of tagNames) {
        let tagNode = nodes.find((n) => n.node_type === "Tag" && n.node_name === tagName);
        if (!tagNode) {
          maxNodeId++;
          const newNodeId = String(maxNodeId);
          tagNode = {
            node_id: newNodeId,
            node_type: "Tag",
            node_name: tagName,
            node_color: "#" + Math.floor(Math.random() * 16777215).toString(16),
            node_music_links_next: [],
            node_music_links_previous: [],
            node_tag_links_next: [],
            node_tag_links_previous: [],
            node_author_links_next: [],
            node_author_links_previous: [],
            node_album_links_next: [],
            node_album_links_previous: [],
          };
          nodes.push(tagNode);
          await docClient.send(new PutCommand({ TableName: GRAPH_TABLE, Item: tagNode }));
        }
        tagNodes.push(tagNode);
      }
      return tagNodes;
    };

    const generalTagNodes = await getOrCreateTags(generalTag || "");
    const allTagIdsUsed = new Set<string>();
    generalTagNodes.forEach((t) => allTagIdsUsed.add(t.node_id));

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (!track) continue;
      const newNodeId = String(maxNodeId + 1);
      maxNodeId++;
      const newMusicId = String(maxMusicId + 1);
      maxMusicId++;

      const trackTagNodes = await getOrCreateTags(track.tag || "");
      const trackTagIds: string[] = Array.from(
        new Set([...generalTagNodes.map((t) => t.node_id), ...trackTagNodes.map((t) => t.node_id)])
      );

      trackTagIds.forEach((id) => allTagIdsUsed.add(id));

      const newNode = {
        node_id: newNodeId,
        node_type: "Music",
        node_name: track.name,
        node_color: authorNode.node_color || "#F28705",
        node_music_links_next: [],
        node_music_links_previous: [],
        node_tag_links_next: trackTagIds,
        node_tag_links_previous: [],
        node_author_links_next: [authorNodeId],
        node_author_links_previous: [],
        node_album_links_next: i < tracks.length - 1 ? [String(parseInt(newNodeId, 10) + 1)] : [],
        node_album_links_previous: i > 0 ? [String(parseInt(newNodeId, 10) - 1)] : [],
        music_id: newMusicId,
        music_name: track.name,
        music_description: track.description || `${track.name} from ${authorName}`,
        music_author: authorName,
        music_cover_url: coverUrl,
        music_url: track.url,
        music_album: albumName,
        likes: 0,
        views: 0,
        shares: 0,
        comments: 0,
      };
      albumNodes.push(newNode);

      for (const tagId of trackTagIds) {
        if (!tagsToUpdate[tagId]) {
          tagsToUpdate[tagId] = nodes.find((n) => n.node_id === tagId);
        }
        if (tagsToUpdate[tagId] && !tagsToUpdate[tagId].node_music_links_next.includes(newNodeId)) {
          tagsToUpdate[tagId].node_music_links_next.push(newNodeId);
        }
        if (
          tagsToUpdate[tagId] &&
          !tagsToUpdate[tagId].node_author_links_next.includes(authorNodeId)
        ) {
          tagsToUpdate[tagId].node_author_links_next.push(authorNodeId);
        }
      }
    }

    for (const node of albumNodes) {
      await docClient.send(new PutCommand({ TableName: GRAPH_TABLE, Item: node }));
    }

    for (const tagId in tagsToUpdate) {
      await docClient.send(new PutCommand({ TableName: GRAPH_TABLE, Item: tagsToUpdate[tagId] }));
    }

    const updatedAuthorNode = {
      ...authorNode,
      node_music_links_next: [
        ...(authorNode.node_music_links_next || []),
        ...albumNodes.map((n) => n.node_id),
      ],
      node_tag_links_next: Array.from(
        new Set([...(authorNode.node_tag_links_next || []), ...allTagIdsUsed])
      ),
    };
    await docClient.send(new PutCommand({ TableName: GRAPH_TABLE, Item: updatedAuthorNode }));

    logger.info("graph_album_uploaded", { albumName, authorName, trackCount: tracks.length });
    res.status(201).json({ message: "Album uploaded successfully", count: tracks.length });
  } catch (error) {
    logger.error("graph_album_upload_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to upload album" });
  }
});

router.post("/register", async (req, res) => {
  const { username, realName, description } = req.body as {
    username?: string;
    realName?: string;
    description?: string;
  };
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const scanCommand = new ScanCommand({
      TableName: GRAPH_TABLE,
    });
    const scanResult = await docClient.send(scanCommand);
    const nodes = (scanResult.Items || []) as Record<string, any>[];

    const exists = nodes.some(
      (n) => n.node_type === "Author" && (n.node_name === username || n.author_name === username)
    );
    if (exists) {
      return res.status(400).json({ error: "User already exists" });
    }

    let maxNodeId = 0;
    let maxAuthorId = 0;
    nodes.forEach((n) => {
      const nid = parseInt(String(n.node_id), 10);
      if (!Number.isNaN(nid) && nid > maxNodeId) maxNodeId = nid;

      if (n.node_type === "Author") {
        const aid = parseInt(String(n.author_id), 10);
        if (!Number.isNaN(aid) && aid > maxAuthorId) maxAuthorId = aid;
      }
    });

    const newNodeId = String(maxNodeId + 1);
    const newAuthorId = String(maxAuthorId + 1);

    const newNode = {
      node_id: newNodeId,
      node_type: "Author",
      node_name: username,
      node_color: "#FF0000",
      node_music_links_next: [],
      node_music_links_previous: [],
      node_tag_links_next: [],
      node_tag_links_previous: [],
      node_author_links_next: [],
      node_author_links_previous: [],
      node_album_links_next: [],
      node_album_links_previous: [],
      author_id: newAuthorId,
      author_name: username,
      author_real_name: realName || username,
      author_description: description || "New user",
      author_profile_picture: "",
      node_music_likes: [],
    };

    const putCommand = new PutCommand({
      TableName: GRAPH_TABLE,
      Item: newNode,
    });
    await docClient.send(putCommand);

    logger.info("graph_author_registered", { username, newNodeId });
    res.status(201).json({ message: "User registered successfully", node: newNode });
  } catch (error) {
    logger.error("graph_register_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to register user" });
  }
});

router.post("/music", async (req, res) => {
  try {
    const item = req.body as Record<string, unknown>;
    const command = new PutCommand({
      TableName: GRAPH_TABLE,
      Item: item,
    });
    await docClient.send(command);
    logger.info("graph_music_put", { name: item.music_name || item.node_name });
    res.status(201).json({ message: "Music item created successfully in node table", item });
  } catch (error) {
    logger.error("graph_music_put_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to create music item" });
  }
});

export default router;
