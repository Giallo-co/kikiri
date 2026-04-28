import { useState, useEffect, useRef } from 'react'
import GraphView from './components/GraphView'
import PlayerBar from "./components/PlayerBar/PlayerBar";
import { graphConfig } from './graphConfig'
import type { NodeDatum, LinkDatum, RawNode } from './types/graph'
import type { Music } from "./types/music";

const DEMO_TRACK: Music = {
  music_id: "1",
  music_name: "Key",
  music_description: '"key" is the song that sort of introduces you to the album',
  music_author: "C418",
  music_cover_url: "http://localhost:9000/music-cover/volume-alpha.jpg",
  music_url: "http://localhost:9000/music/volume-alpha/key.mp3",
  music_album: "Volume Alpha",
  likes: 0,
  views: 0,
  shares: 0,
  comments: 0,
};

interface GraphData {
  nodes: NodeDatum[]
  links: LinkDatum[]
}

export default function App() {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const connect = () => {
      console.log('[SSE] connecting...')
      const es = new EventSource('/api/nodes/stream')
      esRef.current = es

      es.onopen = () => {
        console.log('[SSE] connected')
        setConnected(true)
        setError(null)
      }

      es.onmessage = (event) => {
        try {
          const rawNodes: RawNode[] = JSON.parse(event.data)
          if (rawNodes.length) {
            const nodes: NodeDatum[] = rawNodes.map(rn => ({
              id: rn.node_id,
              name: rn.node_name,
              color: rn.color,
              content: rn.node_content
            }))

            const links: LinkDatum[] = []
            const nodeIds = new Set(rawNodes.map(rn => rn.node_id))

            rawNodes.forEach(rn => {
              const allLinks = [
                ...(rn.node_tag_links || []),
                ...(rn.node_music_links || []),
                ...(rn.node_author_links || []),
                ...(rn.node_album_links || [])
              ]

              allLinks.forEach(targetId => {
                if (nodeIds.has(targetId)) {
                  links.push({
                    source: rn.node_id,
                    target: targetId
                  })
                }
              })
            })

            setGraphData({ nodes, links })
          }
        } catch (e) {
          console.error('[SSE] parse error:', e)
          setError('parse error')
        }
      }

      es.onerror = (e) => {
        console.error('[SSE] error:', e)
        setConnected(false)
        setError('connection error')
        es.close()
        setTimeout(connect, 2000)
      }
    }

    connect()
    return () => { esRef.current?.close() }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: '#f0eeeb' }}>
      {/* Graph Area */}
      <div style={{ width: '100%', height: '100%' }}>
        {graphData && (
          <GraphView
            nodes={graphData.nodes}
            links={graphData.links}
            config={graphConfig}
          />
        )}
      </div>

      {/* SSE Status */}
      <div style={{
        position: 'absolute',
        top: 12,
        right: 16,
        fontSize: 11,
        fontFamily: 'monospace',
        color: connected ? '#6dbf8a' : '#cf6679',
        letterSpacing: '0.05em',
        zIndex: 10,
      }}>
        {connected ? 'live' : 'reconnecting...'}
      </div>

      {error && (
        <div style={{
          position: 'absolute', top: 30, right: 16,
          fontSize: 10, fontFamily: 'monospace', color: '#cf6679', zIndex: 10
        }}>{error}</div>
      )}

      {!graphData && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          fontSize: 12, fontFamily: 'monospace', color: '#999'
        }}>waiting for data...</div>
      )}

      {/* Player Bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', zIndex: 100 }}>
        <PlayerBar track={DEMO_TRACK} />
      </div>
    </div>
  )
}
