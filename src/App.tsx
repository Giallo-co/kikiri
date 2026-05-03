import { useState, useEffect, useRef } from 'react'
import GraphView from './components/GraphView'
import PlayerBar from "./components/PlayerBar/PlayerBar";
import Login from "./components/Login/Login";
import { graphConfig } from './graphConfig'
import type { NodeDatum, LinkDatum, RawNode } from './types/graph'
import type { Music } from "./types/music";

const DEFAULT_TRACK: Music = {
  music_id: "1",
  music_name: "Key",
  music_description: '"key" is the song that sort of introduces you to the album',
  music_author: "C418",
  music_cover_url: "http://localhost:9000/music-cover/c418/volume-alpha.jpg",
  music_url: "http://localhost:9000/music/c418/volume-alpha/01-key.mp3",
  music_album: "Volume Alpha",
  likes: 0,
  views: 0,
  shares: 0,
  comments: 0,
}

const SHUFFLE_STEP_DELAY = 900; // ms between steps

interface GraphData {
  nodes: NodeDatum[]
  links: LinkDatum[]
}

const generateInitialNodes = (count: number): GraphData => {
  const nodes: NodeDatum[] = [];
  const links: LinkDatum[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `initial-${i}`,
      name: `Node ${i}`,
      color: '#444'
    });
  }
  for (let i = 0; i < count; i++) {
    if (Math.random() > 0.7) {
      const target = Math.floor(Math.random() * count);
      if (target !== i) {
        links.push({ source: `initial-${i}`, target: `initial-${target}` });
      }
    }
  }
  return { nodes, links };
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [rawNodes, setRawNodes] = useState<RawNode[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<Music>(DEFAULT_TRACK)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [autoPlay, setAutoPlay] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const esRef = useRef<EventSource | null>(null)

  const handleTrackChange = (track: Music, nodeId?: string, addToHistory = true) => {
    let targetNodeId = nodeId

    if (!targetNodeId) {
      const currentNode = rawNodes.find(rn => {
        let content = rn.node_content
        if (typeof content === 'string') {
          try { content = JSON.parse(content) } catch {}
        }
        return content && (content as any).music_id === track.music_id
      })
      if (currentNode) targetNodeId = currentNode.node_id
    }

    if (targetNodeId) {
      if (addToHistory && currentTrack && selectedNodeId && selectedNodeId !== targetNodeId) {
        setHistory(prev => [...prev, selectedNodeId])
      }
      setSelectedNodeId(targetNodeId)
    }

    setAutoPlay(true)
    setCurrentTrack(track)
  }

  const handleNodeClick = (nodeId: string, content: any) => {
    setSelectedNodeId(nodeId)
    if (content && content.music_id) {
      handleTrackChange(content as Music, nodeId)
    }
  }

  const handleDeselect = () => {
    setSelectedNodeId(null)
  }

  const handleLoginSuccess = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsLoggedIn(true);
      setIsTransitioning(false);
      setSelectedNodeId(null); 
    }, 800);
  }

  const handleNext = () => {
    if (!currentTrack || !rawNodes.length) return
    const currentNode = rawNodes.find(rn => rn.node_id === selectedNodeId)
    if (!currentNode) return

    // Priority 1: Use specific next link
    if (currentNode.node_album_links?.next?.length > 0) {
      const nextId = currentNode.node_album_links.next[0]
      const nextNode = rawNodes.find(rn => rn.node_id === nextId)
      if (nextNode) {
        let nextContent = nextNode.node_content
        if (typeof nextContent === 'string') {
          try { nextContent = JSON.parse(nextContent) } catch {}
        }
        if (nextContent && (nextContent as any).music_id) {
          handleTrackChange(nextContent as Music, nextNode.node_id)
          return
        }
      }
    }

    // Priority 2: Fallback to Author node
    if (currentNode.node_author_links?.next?.length > 0) {
      const authorId = currentNode.node_author_links.next[0]
      setSelectedNodeId(authorId)
    }
  }

  const handlePrevious = () => {
    if (!currentTrack || !rawNodes.length) return
    const currentNode = rawNodes.find(rn => rn.node_id === selectedNodeId)
    if (!currentNode) return

    if (currentNode.node_album_links?.previous?.length > 0) {
      const prevId = currentNode.node_album_links.previous[0]
      const prevNode = rawNodes.find(rn => rn.node_id === prevId)
      if (prevNode) {
        let prevContent = prevNode.node_content
        if (typeof prevContent === 'string') {
          try { prevContent = JSON.parse(prevContent) } catch {}
        }
        if (prevContent && (prevContent as any).music_id) {
          handleTrackChange(prevContent as Music, prevNode.node_id, false)
          return
        }
      }
    }

    // Fallback to Author node
    if (currentNode.node_author_links?.next?.length > 0) {
      const authorId = currentNode.node_author_links.next[0]
      setSelectedNodeId(authorId)
    }
  }

  const handleShuffle = async () => {
    if (!rawNodes.length) return

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    
    const getRandom = <T,>(arr: T[]): T | null => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null

    const findMusicFromAuthor = (authorNode: RawNode) => {
      const musicIds = authorNode.node_music_links?.next || []
      const musics = rawNodes.filter(n => musicIds.includes(n.node_id) && n.node_type === "Music")
      return getRandom(musics)
    }

    const findAuthorFromTag = (tagNode: RawNode) => {
      const authorIds = tagNode.node_author_links?.next || []
      const authors = rawNodes.filter(n => authorIds.includes(n.node_id) && n.node_type === "Author")
      return getRandom(authors)
    }

    let currentNode = selectedNodeId ? rawNodes.find(n => n.node_id === selectedNodeId) : null

    // Helper to execute the full Tag -> Author -> Music flow
    const startFullFlow = async () => {
      const tags = rawNodes.filter(n => n.node_type === "Tag" && (n.node_author_links?.next?.length ?? 0) > 0)
      const randomTag = getRandom(tags.length > 0 ? tags : rawNodes.filter(n => n.node_type === "Tag"))
      if (!randomTag) return false

      setSelectedNodeId(randomTag.node_id)
      await delay(SHUFFLE_STEP_DELAY)

      const randomAuthor = findAuthorFromTag(randomTag)
      if (!randomAuthor) return await startFullFlow() // Retry if tag has no authors

      setSelectedNodeId(randomAuthor.node_id)
      await delay(SHUFFLE_STEP_DELAY)

      const randomMusic = findMusicFromAuthor(randomAuthor)
      if (!randomMusic) return await startFullFlow() // Retry if author has no music

      const content = typeof randomMusic.node_content === 'string' ? JSON.parse(randomMusic.node_content) : randomMusic.node_content
      handleTrackChange(content, randomMusic.node_id)
      return true
    }

    // --- CASE 1: No node selected ---
    if (!currentNode) {
      await startFullFlow()
      return
    }

    // --- CASE 2: Tag selected ---
    if (currentNode.node_type === "Tag") {
      const randomAuthor = findAuthorFromTag(currentNode)
      if (!randomAuthor) {
        await startFullFlow() // Fallback to full flow if current tag is empty
        return
      }
      
      setSelectedNodeId(randomAuthor.node_id)
      await delay(SHUFFLE_STEP_DELAY)
      
      const randomMusic = findMusicFromAuthor(randomAuthor)
      if (!randomMusic) {
        await startFullFlow()
        return
      }
      
      const content = typeof randomMusic.node_content === 'string' ? JSON.parse(randomMusic.node_content) : randomMusic.node_content
      handleTrackChange(content, randomMusic.node_id)
      return
    }

    // --- CASE 3: Author selected ---
    if (currentNode.node_type === "Author") {
      const randomMusic = findMusicFromAuthor(currentNode)
      if (!randomMusic) {
        await startFullFlow()
        return
      }
      
      const content = typeof randomMusic.node_content === 'string' ? JSON.parse(randomMusic.node_content) : randomMusic.node_content
      handleTrackChange(content, randomMusic.node_id)
      return
    }

    // --- CASE 4: Music selected ---
    if (currentNode.node_type === "Music") {
      const relatedIds = [
        ...(currentNode.node_tag_links?.next || []),
        ...(currentNode.node_author_links?.next || [])
      ]
      const relatedNodes = rawNodes.filter(n => relatedIds.includes(n.node_id))
      const randomRelated = getRandom(relatedNodes)
      
      if (!randomRelated) {
        await startFullFlow()
        return
      }

      setSelectedNodeId(randomRelated.node_id)
      await delay(SHUFFLE_STEP_DELAY)

      if (randomRelated.node_type === "Tag") {
        const randomAuthor = findAuthorFromTag(randomRelated)
        if (!randomAuthor) { await startFullFlow(); return }

        setSelectedNodeId(randomAuthor.node_id)
        await delay(SHUFFLE_STEP_DELAY)

        const randomMusic = findMusicFromAuthor(randomAuthor)
        if (!randomMusic) { await startFullFlow(); return }

        const content = typeof randomMusic.node_content === 'string' ? JSON.parse(randomMusic.node_content) : randomMusic.node_content
        handleTrackChange(content, randomMusic.node_id)
      } else if (randomRelated.node_type === "Author") {
        const randomMusic = findMusicFromAuthor(randomRelated)
        if (!randomMusic) { await startFullFlow(); return }

        const content = typeof randomMusic.node_content === 'string' ? JSON.parse(randomMusic.node_content) : randomMusic.node_content
        handleTrackChange(content, randomMusic.node_id)
      }
      return
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return;
    const connect = () => {
      const es = new EventSource('/api/nodes/stream')
      esRef.current = es

      es.onopen = () => {
        setConnected(true)
        setError(null)
      }

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)

          if (parsed.__type === 'track') {
            const track = parsed.track as Music
            if (track && track.music_id) {
              setCurrentTrack(track)
            }
            return
          }

          const incomingNodes: RawNode[] = parsed
          if (Array.isArray(incomingNodes) && incomingNodes.length) {
            setRawNodes(incomingNodes)
            const nodes: NodeDatum[] = incomingNodes.map(rn => {
              let content = rn.node_content
              if (typeof content === 'string') {
                try { content = JSON.parse(content) } catch {}
              }
              return {
                id: rn.node_id,
                name: rn.node_name,
                color: rn.color,
                content
              }
            })

            const links: LinkDatum[] = []
            const nodeIds = new Set(incomingNodes.map(rn => rn.node_id))

            incomingNodes.forEach(rn => {
              const allLinks = [
                ...(rn.node_tag_links?.next || []),
                ...(rn.node_tag_links?.previous || []),
                ...(rn.node_music_links?.next || []),
                ...(rn.node_music_links?.previous || []),
                ...(rn.node_author_links?.next || []),
                ...(rn.node_author_links?.previous || []),
                ...(rn.node_album_links?.next || []),
                ...(rn.node_album_links?.previous || [])
              ]

              allLinks.forEach(targetId => {
                if (nodeIds.has(targetId)) {
                  links.push({ source: rn.node_id, target: targetId })
                }
              })
            })

            setGraphData({ nodes, links })
          }
        } catch (e) {
          setError('parse error')
        }
      }

      es.onerror = () => {
        setConnected(false)
        setError('connection error')
        es.close()
        setTimeout(connect, 2000)
      }
    }

    connect()
    return () => { esRef.current?.close() }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) {
      setGraphData(generateInitialNodes(200));
    }
  }, [isLoggedIn]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: '#f0eeeb' }}>
      
      {(!isLoggedIn || isTransitioning) && (
        <Login onLogin={handleLoginSuccess} isTransitioning={isTransitioning} />
      )}

      <div style={{ width: '100%', height: '100%' }}>
        {graphData && (
          <GraphView
            nodes={graphData.nodes}
            links={graphData.links}
            config={graphConfig}
            selectedId={selectedNodeId}
            onNodeClick={handleNodeClick}
            onDeselect={handleDeselect}
          />
        )}
      </div>

      {isLoggedIn && (
        <>
          <div style={{
            position: 'absolute', top: 12, right: 16, fontSize: 11,
            fontFamily: 'monospace', color: connected ? '#6dbf8a' : '#cf6679',
            letterSpacing: '0.05em', zIndex: 10,
          }}>
            {connected ? 'live' : 'reconnecting...'}
          </div>

          {error && (
            <div style={{
              position: 'absolute', top: 30, right: 16,
              fontSize: 10, fontFamily: 'monospace', color: '#cf6679', zIndex: 10
            }}>{error}</div>
          )}

          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', zIndex: 100 }}>
            <PlayerBar 
              track={currentTrack} 
              autoPlay={autoPlay} 
              onNext={handleNext}
              onPrevious={handlePrevious}
              onShuffle={handleShuffle}
            />
          </div>
        </>
      )}

      {!graphData && !isLoggedIn && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          fontSize: 12, fontFamily: 'monospace', color: '#999'
        }}>generating background...</div>
      )}
    </div>
  )
}
