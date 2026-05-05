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
    let links = userNode.node_music_links_next || [];

    if (likes.includes(musicNodeId)) {
      likes = likes.filter((id: string) => id !== musicNodeId);
      links = links.filter((id: string) => id !== musicNodeId);
    } else {
      likes.push(musicNodeId);
      links.push(musicNodeId);
    }

    const putCommand = new PutCommand({
      TableName: "node",
      Item: { ...userNode, node_music_likes: likes, node_music_links_next: links }
    });
    await docClient.send(putCommand);

    console.log(`[Backend] User ${username} toggled like for music node ${musicNodeId}`);
    res.json({ message: "Success", likes, links });
  } catch (error) {
    console.error("Error toggling like in DynamoDB:", error);
    res.status(500).json({ error: "Failed to update likes" });
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
