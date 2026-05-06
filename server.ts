import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb"

const app = express()
const PORT = 5002

// DynamoDB Configuration
// These can be moved to environment variables for easy AWS migration
const dynamoConfig = {
  region: "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8002",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin123",
  },
}

const client = new DynamoDBClient(dynamoConfig)
const docClient = DynamoDBDocumentClient.from(client)

app.use(cors())
app.use(express.json())

const clients = new Set<express.Response>()

let lastTrack: object | null = null

const fetchNodesFromDynamo = async () => {
  try {
    const command = new ScanCommand({
      TableName: "node",
    })
    const response = await docClient.send(command)
    return JSON.stringify(response.Items || [])
  } catch (error) {
    console.error("Error fetching from DynamoDB:", error)
    return "[]"
  }
}

const broadcast = (line: string) => {
  clients.forEach(res => res.write(`data: ${line}\n\n`))
}

const broadcastTrack = (track: object) => {
  const payload = JSON.stringify({ __type: 'track', track })
  clients.forEach(res => res.write(`data: ${payload}\n\n`))
}

let lastContent = ''
setInterval(async () => {
  try {
    const current = await fetchNodesFromDynamo()
    if (current !== lastContent) {
      lastContent = current
      broadcast(current)
    }
  } catch {}
}, 1000) // Increased interval slightly for DynamoDB scan

app.get('/api/nodes', async (_req, res) => {
  try {
    const nodes = await fetchNodesFromDynamo()
    res.json(JSON.parse(nodes))
  } catch {
    res.status(500).json({ error: 'Failed to fetch nodes from DynamoDB' })
  }
})

app.get('/api/nodes/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const line = await fetchNodesFromDynamo()
    lastContent = line
    res.write(`data: ${line}\n\n`)
  } catch {}

  if (lastTrack) {
    const payload = JSON.stringify({ __type: 'track', track: lastTrack })
    res.write(`data: ${payload}\n\n`)
  }

  clients.add(res)

  req.on('close', () => {
    clients.delete(res)
  })
})

app.get('/api/current-track', (_req, res) => {
  if (lastTrack) {
    res.json(lastTrack)
  } else {
    res.status(204).end()
  }
})

app.post('/api/node-selected', (req, res) => {
  const { id, name, content } = req.body
  console.log(`[Backend] Node Selected: ${name} (ID: ${id})`)
  console.log(`[Backend] Content:`, content)

  if (content && content.music_id) {
    lastTrack = content
    broadcastTrack(content)
  }

  res.sendStatus(200)
})

app.post('/api/like', async (req, res) => {
  const { username, musicNodeId } = req.body;
  if (!username || !musicNodeId) {
    return res.status(400).json({ error: 'Username and musicNodeId are required' });
  }

  try {
    const scanCommand = new ScanCommand({
      TableName: "node",
      FilterExpression: "node_type = :type AND (node_name = :name OR author_name = :name)",
      ExpressionAttributeValues: {
        ":type": "Author",
        ":name": username
      }
    });
    const scanResult = await docClient.send(scanCommand);
    const userNode = scanResult.Items?.[0];

    if (!userNode) {
      return res.status(404).json({ error: "User not found" });
    }

    const nodeId = userNode.node_id;
    let likes = userNode.node_music_likes || [];

    if (likes.includes(musicNodeId)) {
      likes = likes.filter((id: string) => id !== musicNodeId);
    } else {
      likes.push(musicNodeId);
    }

    const putCommand = new PutCommand({
      TableName: "node",
      Item: { ...userNode, node_music_likes: likes }
    });
    await docClient.send(putCommand);

    console.log(`[Backend] User ${username} toggled like for music node ${musicNodeId}`);
    res.json({ message: "Success", likes });
  } catch (error) {
    console.error("Error toggling like in DynamoDB:", error);
    res.status(500).json({ error: "Failed to update likes" });
  }
});

app.post('/api/profile/update', async (req, res) => {
  const { node_id, author_description, node_color, node_name, author_name } = req.body;
  if (!node_id) {
    return res.status(400).json({ error: 'node_id is required' });
  }

  try {
    const scanCommand = new ScanCommand({
      TableName: "node",
      FilterExpression: "node_id = :id",
      ExpressionAttributeValues: {
        ":id": node_id
      }
    });
    const scanResult = await docClient.send(scanCommand);
    const userNode = scanResult.Items?.[0];

    if (!userNode) {
      return res.status(404).json({ error: "Node not found" });
    }

    const updatedNode = {
      ...userNode,
      author_description: author_description !== undefined ? author_description : userNode.author_description,
      node_color: node_color !== undefined ? node_color : userNode.node_color,
      node_name: node_name !== undefined ? node_name : userNode.node_name,
      author_name: author_name !== undefined ? author_name : userNode.author_name,
    };

    const putCommand = new PutCommand({
      TableName: "node",
      Item: updatedNode
    });
    await docClient.send(putCommand);

    console.log(`[Backend] Profile updated for node ${node_id}`);
    res.json({ message: "Success", node: updatedNode });
  } catch (error) {
    console.error("Error updating profile in DynamoDB:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.post('/api/album/upload', async (req, res) => {
  const { albumName, authorName, coverUrl, generalTag, tracks, postedBy } = req.body;
  if (!albumName || !authorName || !tracks || !Array.isArray(tracks)) {
    return res.status(400).json({ error: 'Album name, author name, and tracks are required' });
  }

  try {
    const scanCommand = new ScanCommand({ TableName: "node" });
    const scanResult = await docClient.send(scanCommand);
    const nodes = scanResult.Items || [];

    // Find Author node
    let authorNode = nodes.find(n => n.node_type === 'Author' && (n.node_name === authorName || n.author_name === authorName));
    
    if (!authorNode) {
      authorNode = nodes.find(n => n.node_type === 'Author' && (n.node_name === postedBy || n.author_name === postedBy));
    }

    if (!authorNode) {
      return res.status(404).json({ error: 'Author node not found. Please ensure the author exists.' });
    }

    const authorNodeId = authorNode.node_id;
    let maxNodeId = 0;
    let maxMusicId = 0;
    nodes.forEach(n => {
      const nid = parseInt(n.node_id);
      if (!isNaN(nid) && nid > maxNodeId) maxNodeId = nid;
      
      const mid = parseInt(n.music_id);
      if (!isNaN(mid) && mid > maxMusicId) maxMusicId = mid;
    });

    const albumNodes = [];
    const tagsToUpdate: Record<string, any> = {};

    const getOrCreateTag = async (tagName: string) => {
      let tagNode = nodes.find(n => n.node_type === 'Tag' && n.node_name === tagName);
      if (!tagNode) {
        maxNodeId++;
        const newNodeId = String(maxNodeId);
        tagNode = {
          "node_id": newNodeId,
          "node_type": "Tag",
          "node_name": tagName,
          "node_color": "#" + Math.floor(Math.random()*16777215).toString(16),
          "node_music_links_next": [],
          "node_music_links_previous": [],
          "node_tag_links_next": [],
          "node_tag_links_previous": [],
          "node_author_links_next": [],
          "node_author_links_previous": [],
          "node_album_links_next": [],
          "node_album_links_previous": []
        };
        nodes.push(tagNode);
        // We'll save it later or now
        await docClient.send(new PutCommand({ TableName: "node", Item: tagNode }));
      }
      return tagNode;
    };

    let generalTagNode: any = null;
    if (generalTag) {
      generalTagNode = await getOrCreateTag(generalTag);
    }

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const newNodeId = String(maxNodeId + 1);
      maxNodeId++;
      const newMusicId = String(maxMusicId + 1);
      maxMusicId++;

      const trackTagIds: string[] = [];
      if (generalTagNode) trackTagIds.push(generalTagNode.node_id);
      
      if (track.tag) {
        const trackTagNode = await getOrCreateTag(track.tag);
        if (!trackTagIds.includes(trackTagNode.node_id)) {
          trackTagIds.push(trackTagNode.node_id);
        }
      }

      const newNode = {
        "node_id": newNodeId,
        "node_type": "Music",
        "node_name": track.name,
        "node_color": authorNode.node_color || "#F28705",
        "node_music_links_next": [],
        "node_music_links_previous": [],
        "node_tag_links_next": trackTagIds,
        "node_tag_links_previous": [],
        "node_author_links_next": [authorNodeId],
        "node_author_links_previous": [],
        "node_album_links_next": i < tracks.length - 1 ? [String(parseInt(newNodeId) + 1)] : [],
        "node_album_links_previous": i > 0 ? [String(parseInt(newNodeId) - 1)] : [],
        "music_id": newMusicId,
        "music_name": track.name,
        "music_description": track.description || `${track.name} from ${authorName}`,
        "music_author": authorName,
        "music_cover_url": coverUrl,
        "music_url": track.url,
        "music_album": albumName,
        "likes": 0,
        "views": 0,
        "shares": 0,
        "comments": 0
      };
      albumNodes.push(newNode);

      // Prepare tag updates
      for (const tagId of trackTagIds) {
        if (!tagsToUpdate[tagId]) {
          tagsToUpdate[tagId] = nodes.find(n => n.node_id === tagId);
        }
        if (!tagsToUpdate[tagId].node_music_links_next.includes(newNodeId)) {
          tagsToUpdate[tagId].node_music_links_next.push(newNodeId);
        }
      }
    }

    // Save Music nodes
    for (const node of albumNodes) {
      await docClient.send(new PutCommand({
        TableName: "node",
        Item: node
      }));
    }

    // Save Tag updates
    for (const tagId in tagsToUpdate) {
      await docClient.send(new PutCommand({
        TableName: "node",
        Item: tagsToUpdate[tagId]
      }));
    }

    // Update Author node's music_links
    const updatedAuthorNode = {
      ...authorNode,
      node_music_links_next: [...(authorNode.node_music_links_next || []), ...albumNodes.map(n => n.node_id)]
    };
    await docClient.send(new PutCommand({
      TableName: "node",
      Item: updatedAuthorNode
    }));

    console.log(`[Backend] Album "${albumName}" by ${authorName} uploaded with ${tracks.length} tracks.`);
    res.status(201).json({ message: 'Album uploaded successfully', count: tracks.length });
  } catch (error) {
    console.error("Error uploading album to DynamoDB:", error);
    res.status(500).json({ error: "Failed to upload album" });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, realName, description } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const scanCommand = new ScanCommand({
      TableName: "node",
    });
    const scanResult = await docClient.send(scanCommand);
    const nodes = scanResult.Items || [];

    // Check if user already exists
    const exists = nodes.some(n => n.node_type === 'Author' && (n.node_name === username || n.author_name === username));
    if (exists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Determine next IDs
    let maxNodeId = 0;
    let maxAuthorId = 0;
    nodes.forEach(n => {
      const nid = parseInt(n.node_id);
      if (!isNaN(nid) && nid > maxNodeId) maxNodeId = nid;
      
      if (n.node_type === 'Author') {
        const aid = parseInt(n.author_id);
        if (!isNaN(aid) && aid > maxAuthorId) maxAuthorId = aid;
      }
    });

    const newNodeId = String(maxNodeId + 1);
    const newAuthorId = String(maxAuthorId + 1);

    const newNode = {
      "node_id": newNodeId,
      "node_type": "Author",
      "node_name": username,
      "node_color": "#FF0000",
      "node_music_links_next": [],
      "node_music_links_previous": [],
      "node_tag_links_next": [],
      "node_tag_links_previous": [],
      "node_author_links_next": [],
      "node_author_links_previous": [],
      "node_album_links_next": [],
      "node_album_links_previous": [],
      "author_id": newAuthorId,
      "author_name": username,
      "author_real_name": realName || username,
      "author_description": description || "New user",
      "author_profile_picture": "",
      "node_music_likes": []
    };

    const putCommand = new PutCommand({
      TableName: "node",
      Item: newNode,
    });
    await docClient.send(putCommand);

    console.log(`[Backend] New user registered and Author node created: ${username} (Node ID: ${newNodeId}, Author ID: ${newAuthorId})`);
    res.status(201).json({ message: 'User registered successfully', node: newNode });
  } catch (error) {
    console.error("Error registering user in DynamoDB:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.post('/api/music', async (req, res) => {
  try {
    const item = req.body
    const command = new PutCommand({
      TableName: "node",
      Item: item,
    })
    await docClient.send(command)
    console.log(`[Backend] Music item added to node table: ${item.music_name || item.node_name}`)
    res.status(201).json({ message: 'Music item created successfully in node table', item })
  } catch (error) {
    console.error("Error creating music item in node table:", error)
    res.status(500).json({ error: 'Failed to create music item' })
  }
})

createServer(app).listen(PORT, () => {
  console.log(`Graph API running on http://localhost:${PORT}`)
})
