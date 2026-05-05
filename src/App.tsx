import { useState, useEffect, useRef, useCallback } from 'react'
import GraphView from './components/GraphView'
import PlayerBar from "./components/PlayerBar/PlayerBar";
import Login from "./components/Login/Login";
import { graphConfig } from './graphConfig'
import type { NodeDatum, LinkDatum, RawNode } from './types/graph'
import type { Music } from "./types/music";

const DEFAULT_TRACK: Music = {
  music_id: "59",
  music_name: "Key",
  music_description: "Key from C418",
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
    // Darker grayscale for visibility on white background
    const v = Math.floor(Math.random() * 100) + 20;
    const color = `rgb(${v},${v},${v})`;
    nodes.push({
      id: `initial-${i}`,
      name: `Node ${i}`,
      color: color
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
  const [graphData, setGraphData] = useState<GraphData | null>(() => generateInitialNodes(200))
  const [rawNodes, setRawNodes] = useState<RawNode[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<Music>(DEFAULT_TRACK)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isManualSelection, setIsManualSelection] = useState(false)
  const [shouldFocus, setShouldFocus] = useState(true)
  const [autoPlay, setAutoPlay] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const esRef = useRef<EventSource | null>(null)

  const handleTrackChange = useCallback((track: Music, nodeId?: string, addToHistory = true, focus = true) => {
    let targetNodeId = nodeId

    if (!targetNodeId) {
      const currentNode = rawNodes.find(rn => rn.music_id === track.music_id)
      if (currentNode) targetNodeId = currentNode.node_id
    }

    if (targetNodeId) {
      if (addToHistory && currentTrack && selectedNodeId && selectedNodeId !== targetNodeId) {
        setHistory(prev => [...prev, selectedNodeId])
      }
      setSelectedNodeId(targetNodeId)
      setShouldFocus(focus)
    }

    setAutoPlay(true)
    if (currentTrack?.music_id !== track.music_id) {
      setCurrentTrack(track)
    }
  }, [rawNodes, currentTrack, selectedNodeId])

  const handleNodeClick = useCallback((nodeId: string, content: any) => {
    setSelectedNodeId(nodeId)
    setIsManualSelection(true)
    setShouldFocus(true)
    if (content && content.music_id) {
      handleTrackChange(content as Music, nodeId, true, true)
    }
  }, [handleTrackChange])

  const handleDeselect = useCallback(() => {
    setSelectedNodeId(null)
    setIsManualSelection(false)
    setShouldFocus(true)
  }, [])

  const handleLoginSuccess = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsLoggedIn(true);
      setIsTransitioning(false);
      setSelectedNodeId(null); 
    }, 800);
  }, [])

  const handleNext = useCallback(() => {
    if (!currentTrack || !rawNodes.length) return
    const currentNode = rawNodes.find(rn => rn.node_id === selectedNodeId)
    const baseNode = currentNode || rawNodes.find(rn => rn.music_id === currentTrack.music_id)
    if (!baseNode) return

    // Priority 1: Use specific next link
    if (baseNode.node_album_links_next?.length > 0) {
      const nextId = baseNode.node_album_links_next[0]
      const nextNode = rawNodes.find(rn => rn.node_id === nextId)
      if (nextNode && nextNode.node_type === "Music") {
        handleTrackChange(nextNode as unknown as Music, nextNode.node_id, true, isManualSelection)
        return
      }
    }

    // Priority 2: Fallback to Author node
    if (baseNode.node_author_links_next?.length > 0) {
      const authorId = baseNode.node_author_links_next[0]
      setSelectedNodeId(authorId)
      setShouldFocus(isManualSelection)
    }
  }, [currentTrack, rawNodes, selectedNodeId, isManualSelection, handleTrackChange])

  const handlePrevious = useCallback(() => {
    if (!currentTrack || !rawNodes.length) return
    const currentNode = rawNodes.find(rn => rn.node_id === selectedNodeId)
    const baseNode = currentNode || rawNodes.find(rn => rn.music_id === currentTrack.music_id)
    if (!baseNode) return

    if (baseNode.node_album_links_previous?.length > 0) {
      const prevId = baseNode.node_album_links_previous[0]
      const prevNode = rawNodes.find(rn => rn.node_id === prevId)
      if (prevNode && prevNode.node_type === "Music") {
        handleTrackChange(prevNode as unknown as Music, prevNode.node_id, false, isManualSelection)
        return
      }
    }

    // Fallback to Author node
    if (baseNode.node_author_links_next?.length > 0) {
      const authorId = baseNode.node_author_links_next[0]
      setSelectedNodeId(authorId)
      setShouldFocus(isManualSelection)
    }
  }, [currentTrack, rawNodes, selectedNodeId, isManualSelection, handleTrackChange])

  const handleShuffle = useCallback(async () => {
    if (!rawNodes.length) return

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    
    const getRandom = <T,>(arr: T[]): T | null => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null

    const findMusicFromAuthor = (authorNode: RawNode) => {
      const musicIds = authorNode.node_music_links_next || []
      const musics = rawNodes.filter(n => musicIds.includes(n.node_id) && n.node_type === "Music")
      return getRandom(musics)
    }

    const findAuthorFromTag = (tagNode: RawNode) => {
      const authorIds = tagNode.node_author_links_next || []
      const authors = rawNodes.filter(n => authorIds.includes(n.node_id) && n.node_type === "Author")
      return getRandom(authors)
    }

    let currentNode = selectedNodeId ? rawNodes.find(n => n.node_id === selectedNodeId) : null

    // Helper to execute the full Tag -> Author -> Music flow
    const startFullFlow = async (): Promise<boolean> => {
      const tags = rawNodes.filter(n => n.node_type === "Tag" && (n.node_author_links_next?.length ?? 0) > 0)
      const randomTag = getRandom(tags.length > 0 ? tags : rawNodes.filter(n => n.node_type === "Tag"))
      if (!randomTag) return false

      setSelectedNodeId(randomTag.node_id)
      setShouldFocus(isManualSelection)
      await delay(SHUFFLE_STEP_DELAY)

      const randomAuthor = findAuthorFromTag(randomTag)
      if (!randomAuthor) return await startFullFlow() // Retry if tag has no authors

      setSelectedNodeId(randomAuthor.node_id)
      setShouldFocus(isManualSelection)
      await delay(SHUFFLE_STEP_DELAY)

      const randomMusic = findMusicFromAuthor(randomAuthor)
      if (!randomMusic) return await startFullFlow() // Retry if author has no music

      handleTrackChange(randomMusic as unknown as Music, randomMusic.node_id, true, isManualSelection)
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
      setShouldFocus(isManualSelection)
      await delay(SHUFFLE_STEP_DELAY)
      
      const randomMusic = findMusicFromAuthor(randomAuthor)
      if (!randomMusic) {
        await startFullFlow()
        return
      }
      
      handleTrackChange(randomMusic as unknown as Music, randomMusic.node_id, true, isManualSelection)
      return
    }

    // --- CASE 3: Author selected ---
    if (currentNode.node_type === "Author") {
      const randomMusic = findMusicFromAuthor(currentNode)
      if (!randomMusic) {
        await startFullFlow()
        return
      }
      
      handleTrackChange(randomMusic as unknown as Music, randomMusic.node_id, true, isManualSelection)
      return
    }

    // --- CASE 4: Music selected ---
    if (currentNode.node_type === "Music") {
      const relatedIds = [
        ...(currentNode.node_tag_links_next || []),
        ...(currentNode.node_author_links_next || [])
      ]
      const relatedNodes = rawNodes.filter(n => relatedIds.includes(n.node_id))
      const randomRelated = getRandom(relatedNodes)
      
      if (!randomRelated) {
        await startFullFlow()
        return
      }

      setSelectedNodeId(randomRelated.node_id)
      setShouldFocus(isManualSelection)
      await delay(SHUFFLE_STEP_DELAY)

      if (randomRelated.node_type === "Tag") {
        const randomAuthor = findAuthorFromTag(randomRelated)
        if (!randomAuthor) { await startFullFlow(); return }

        setSelectedNodeId(randomAuthor.node_id)
        setShouldFocus(isManualSelection)
        await delay(SHUFFLE_STEP_DELAY)

        const randomMusic = findMusicFromAuthor(randomAuthor)
        if (!randomMusic) { await startFullFlow(); return }

        handleTrackChange(randomMusic as unknown as Music, randomMusic.node_id, true, isManualSelection)
      } else if (randomRelated.node_type === "Author") {
        const randomMusic = findMusicFromAuthor(randomRelated)
        if (!randomMusic) { await startFullFlow(); return }

        handleTrackChange(randomMusic as unknown as Music, randomMusic.node_id, true, isManualSelection)
      }
      return
    }
  }, [rawNodes, selectedNodeId, isManualSelection, handleTrackChange])

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
              // Pass the whole node as content if it's a Music or Author node.
              return {
                id: rn.node_id,
                name: rn.node_name,
                color: rn.node_color,
                content: (rn.node_type === "Music" || rn.node_type === "Author") ? rn : null
              }
            })

            const links: LinkDatum[] = []
            const nodeIds = new Set(incomingNodes.map(rn => rn.node_id))

            incomingNodes.forEach(rn => {
              const allLinks = [
                ...(rn.node_tag_links_next || []),
                ...(rn.node_tag_links_previous || []),
                ...(rn.node_music_links_next || []),
                ...(rn.node_music_links_previous || []),
                ...(rn.node_author_links_next || []),
                ...(rn.node_author_links_previous || []),
                ...(rn.node_album_links_next || []),
                ...(rn.node_album_links_previous || [])
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
      // Background nodes are initialized in state, but we ensure they stay if logged out
      // (This can be empty or used to reset if needed)
    }
  }, [isLoggedIn]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: '#ebebeb' }}>
      
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
            shouldFocus={shouldFocus}
            isLoggedIn={isLoggedIn}
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
