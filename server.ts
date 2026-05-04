import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb"

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

createServer(app).listen(PORT, () => {
  console.log(`Graph API running on http://localhost:${PORT}`)
})
