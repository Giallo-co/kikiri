import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { createServer } from 'http'

const app = express()
const PORT = 5002
const NODES_FILE = path.resolve('./nodes.json')

app.use(cors())
app.use(express.json())

const clients = new Set<express.Response>()

let lastTrack: object | null = null

const readNodes = () => {
  const raw = fs.readFileSync(NODES_FILE, 'utf-8')
  return JSON.stringify(JSON.parse(raw))
}

const broadcast = (line: string) => {
  clients.forEach(res => res.write(`data: ${line}\n\n`))
}

const broadcastTrack = (track: object) => {
  const payload = JSON.stringify({ __type: 'track', track })
  clients.forEach(res => res.write(`data: ${payload}\n\n`))
}

let lastContent = ''
setInterval(() => {
  try {
    const current = readNodes()
    if (current !== lastContent) {
      lastContent = current
      broadcast(current)
    }
  } catch {}
}, 500)

app.get('/api/nodes', (_req, res) => {
  try {
    res.json(JSON.parse(readNodes()))
  } catch {
    res.status(500).json({ error: 'Failed to read nodes.json' })
  }
})

app.get('/api/nodes/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const line = readNodes()
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
