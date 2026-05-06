import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GraphView from './components/GraphView'
import PlayerBar from "./components/PlayerBar/PlayerBar";
import SideNav, { NavItem } from "./components/SideNav/SideNav";
import Login from "./components/Login/Login";
import Profile from "./components/Profile/Profile";
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
  const [username, setUsername] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<NavItem>('Home')
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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTrigger, setSearchTrigger] = useState(0)
  const [currentConfig, setCurrentConfig] = useState(graphConfig)
  const esRef = useRef<EventSource | null>(null)

  const visibleNodes = useMemo(() => {
    if (!rawNodes.length || !isLoggedIn || !username) return []

    const userNode = rawNodes.find(n => n.node_type === 'Author' && (n.node_name === username || n.author_name === username))
    const likedMusicIds = userNode?.node_music_likes || []
    
    // helper to get all links for BFS
    const getAllLinks = (n: RawNode) => [
      ...(n.node_tag_links_next || []),
      ...(n.node_tag_links_previous || []),
      ...(n.node_author_links_next || []),
      ...(n.node_author_links_previous || []),
      ...(n.node_album_links_next || []),
      ...(n.node_album_links_previous || []),
      ...(n.node_music_links_next || []),
      ...(n.node_music_links_previous || [])
    ].filter(id => id && id !== n.node_id);

    const getReachableFrom = (startingNodes: RawNode[], maxDepth: number) => {
      const reachableIds = new Set<string>()
      const rawNodesMap = new Map(rawNodes.map(n => [n.node_id, n]))
      const queue: { id: string, depth: number }[] = []
      
      startingNodes.forEach(m => {
        reachableIds.add(m.node_id)
        queue.push({ id: m.node_id, depth: 0 })
      })

      while (queue.length > 0) {
        const { id: currentId, depth } = queue.shift()!
        if (depth >= maxDepth) continue
        const currentNode = rawNodesMap.get(currentId)
        if (!currentNode) continue
        getAllLinks(currentNode).forEach(nid => {
          if (!reachableIds.has(nid)) {
            reachableIds.add(nid)
            queue.push({ id: nid, depth: depth + 1 })
          }
        })
      }
      return reachableIds
    }

    // --- SEARCH TAB LOGIC ---
    if (activeTab === 'Search') {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return rawNodes.filter(rn => 
          (rn.node_name?.toLowerCase().includes(q)) ||
          (rn.music_author?.toLowerCase().includes(q)) ||
          (rn.music_description?.toLowerCase().includes(q)) ||
          (rn.author_real_name?.toLowerCase().includes(q)) ||
          (rn.author_name?.toLowerCase().includes(q))
        )
      } else {
        // Union of Home and Explore: basically everything reachable
        // To be safe, let's just show all nodes that are organizational or music
        // But the prompt says "Home and Explore", so let's combine their logic
        const homeMusic = rawNodes.filter(rn => rn.node_type === 'Music' && likedMusicIds.includes(rn.node_id))
        const exploreMusic = rawNodes.filter(rn => rn.node_type === 'Music' && !likedMusicIds.includes(rn.node_id))
        
        const homeReachable = getReachableFrom(homeMusic, 2)
        const exploreReachable = getReachableFrom(exploreMusic, 100)
        
        const unionIds = new Set([...homeReachable, ...exploreReachable])
        return rawNodes.filter(rn => {
          if (rn.node_type === 'Author' && (!rn.node_music_links_next || rn.node_music_links_next.length === 0)) return false
          if (rn.node_id === userNode?.node_id) return true
          return unionIds.has(rn.node_id)
        })
      }
    }

    // --- NORMAL TABS LOGIC ---
    const visibleMusicNodes = rawNodes.filter(rn => {
      if (rn.node_type !== 'Music') return false
      if (activeTab === 'Home') return likedMusicIds.includes(rn.node_id)
      if (activeTab === 'Explore') return !likedMusicIds.includes(rn.node_id)
      return true
    })
    
    const visibleMusicIds = new Set(visibleMusicNodes.map(m => m.node_id))
    const maxDepth = activeTab === 'Home' ? 2 : 100 
    const reachableIds = getReachableFrom(visibleMusicNodes, maxDepth)

    return rawNodes.filter(rn => {
      if (rn.node_type === 'Author' && (!rn.node_music_links_next || rn.node_music_links_next.length === 0)) return false
      if (rn.node_id === userNode?.node_id) return true
      if (rn.node_type === 'Music' && !visibleMusicIds.has(rn.node_id)) return false
      return reachableIds.has(rn.node_id)
    })
  }, [rawNodes, activeTab, isLoggedIn, username, searchQuery])

  const fixedNodeId = useMemo(() => {
    if (!isLoggedIn || !username || !rawNodes.length) return null
    const userNode = rawNodes.find(n => n.node_type === 'Author' && (n.node_name === username || n.author_name === username))
    if (userNode && userNode.node_music_links_next && userNode.node_music_links_next.length > 0) {
      return userNode.node_id
    }
    return null
  }, [isLoggedIn, username, rawNodes])

  const handleTrackChange = useCallback((track: Music, nodeId?: string, addToHistory = true, focus = true) => {
    let targetNodeId = nodeId

    if (!targetNodeId) {
      const currentNode = visibleNodes.find(rn => rn.music_id === track.music_id)
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
  }, [visibleNodes, currentTrack, selectedNodeId])

  const handleNext = useCallback(() => {
    if (!currentTrack || !visibleNodes.length) return
    const currentNode = visibleNodes.find(rn => rn.node_id === selectedNodeId)
    const baseNode = currentNode || visibleNodes.find(rn => rn.music_id === currentTrack.music_id)
    if (!baseNode) return

    // Priority 1: Use specific next link
    if (baseNode.node_album_links_next?.length > 0) {
      const nextId = baseNode.node_album_links_next[0]
      const nextNode = visibleNodes.find(rn => rn.node_id === nextId)
      if (nextNode && nextNode.node_type === "Music") {
        handleTrackChange(nextNode as unknown as Music, nextNode.node_id, true, isManualSelection)
        return
      }
    }

    // Priority 2: Fallback to Author node
    if (baseNode.node_author_links_next?.length > 0) {
      const authorId = baseNode.node_author_links_next[0]
      if (visibleNodes.some(n => n.node_id === authorId)) {
        setSelectedNodeId(authorId)
        setShouldFocus(isManualSelection)
      }
    }
  }, [currentTrack, visibleNodes, selectedNodeId, isManualSelection, handleTrackChange])

  const handlePrevious = useCallback(() => {
    if (!currentTrack || !visibleNodes.length) return
    const currentNode = visibleNodes.find(rn => rn.node_id === selectedNodeId)
    const baseNode = currentNode || visibleNodes.find(rn => rn.music_id === currentTrack.music_id)
    if (!baseNode) return

    if (baseNode.node_album_links_previous?.length > 0) {
      const prevId = baseNode.node_album_links_previous[0]
      const prevNode = visibleNodes.find(rn => rn.node_id === prevId)
      if (prevNode && prevNode.node_type === "Music") {
        handleTrackChange(prevNode as unknown as Music, prevNode.node_id, false, isManualSelection)
        return
      }
    }

    // Fallback to Author node
    if (baseNode.node_author_links_next?.length > 0) {
      const authorId = baseNode.node_author_links_next[0]
      if (visibleNodes.some(n => n.node_id === authorId)) {
        setSelectedNodeId(authorId)
        setShouldFocus(isManualSelection)
      }
    }
  }, [currentTrack, visibleNodes, selectedNodeId, isManualSelection, handleTrackChange])

  const handleShuffle = useCallback(async () => {
    if (!visibleNodes.length) return

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    
    const getRandom = <T,>(arr: T[]): T | null => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null

    const findMusicFromAuthor = (authorNode: RawNode) => {
      const musicIds = authorNode.node_music_links_next || []
      const musics = visibleNodes.filter(n => musicIds.includes(n.node_id) && n.node_type === "Music")
      return getRandom(musics)
    }

    const findAuthorFromTag = (tagNode: RawNode) => {
      const authorIds = tagNode.node_author_links_next || []
      const authors = visibleNodes.filter(n => authorIds.includes(n.node_id) && n.node_type === "Author")
      return getRandom(authors)
    }

    let currentNode = selectedNodeId ? visibleNodes.find(n => n.node_id === selectedNodeId) : null

    // Helper to execute the full Tag -> Author -> Music flow
    const startFullFlow = async (): Promise<boolean> => {
      const tags = visibleNodes.filter(n => n.node_type === "Tag" && (n.node_author_links_next?.length ?? 0) > 0)
      const randomTag = getRandom(tags.length > 0 ? tags : visibleNodes.filter(n => n.node_type === "Tag"))
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

  const handleNodeClick = useCallback((nodeId: string, content: any) => {
    setSelectedNodeId(nodeId)
    setIsManualSelection(true)
    setShouldFocus(true)

    // If we are NOT in search mode, do the track change as usual
    if (activeTab !== 'Search' && content && content.music_id) {
      handleTrackChange(content as Music, nodeId, true, true)
    } else if (activeTab === 'Search' && content && content.music_id) {
      // In search mode, play music but stay in Search tab
      handleTrackChange(content as Music, nodeId, true, true)
    }
  }, [handleTrackChange, activeTab])

  const handleDeselect = useCallback(() => {
    setSelectedNodeId(null)
    setIsManualSelection(false)
    setShouldFocus(true)
  }, [])

  const handleLoginSuccess = useCallback((user: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setUsername(user);
      setIsLoggedIn(true);
      setIsTransitioning(false);
      setSelectedNodeId(null); 
    }, 800);
  }, [])

  const handleNavSelect = useCallback((item: NavItem) => {
    setActiveTab(item);
    if (item !== 'Search') {
      setSearchQuery('')
    }
  }, []);

  const handleProfileUpdate = useCallback((updatedNode: RawNode) => {
    setRawNodes(prev => prev.map(n => n.node_id === updatedNode.node_id ? updatedNode : n));
    if (updatedNode.node_name) setUsername(updatedNode.node_name);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        handleDeselect()
        setActiveTab('Search')
        setSearchQuery('')
        setSearchTrigger(prev => prev + 1)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleDeselect])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (!query) return

    const q = query.toLowerCase()
    const matches = rawNodes.filter(rn => 
      (rn.node_name?.toLowerCase().includes(q)) ||
      (rn.music_author?.toLowerCase().includes(q)) ||
      (rn.music_description?.toLowerCase().includes(q)) ||
      (rn.author_real_name?.toLowerCase().includes(q)) ||
      (rn.author_name?.toLowerCase().includes(q))
    )

    if (matches.length === 1) {
      const match = matches[0]
      const content = (match.node_type === "Music" || match.node_type === "Author" || match.node_type === "Tag") ? match : null
      
      // Auto-select and play if it's a single match
      setSelectedNodeId(match.node_id)
      setIsManualSelection(true)
      setShouldFocus(true)
      if (content && content.music_id) {
        handleTrackChange(content as Music, match.node_id, true, true)
      }
    }
  }, [rawNodes, handleTrackChange])

  useEffect(() => {
    if (!searchQuery) {
      setCurrentConfig(graphConfig)
      return
    }

    const q = searchQuery.toLowerCase()
    const matches = rawNodes.filter(rn => 
      (rn.node_name?.toLowerCase().includes(q)) ||
      (rn.music_author?.toLowerCase().includes(q)) ||
      (rn.music_description?.toLowerCase().includes(q)) ||
      (rn.author_real_name?.toLowerCase().includes(q)) ||
      (rn.author_name?.toLowerCase().includes(q))
    )

    if (matches.length >= 2) {
      setSelectedNodeId(null) 
      setCurrentConfig(prev => ({
        ...prev,
        outerExclusionRadius: matches.length * 5
      }))
    } else {

      setCurrentConfig(graphConfig)
    }
  }, [searchQuery, rawNodes])

  useEffect(() => {
    const nodes: NodeDatum[] = visibleNodes.map(rn => ({
      id: rn.node_id,
      name: rn.node_name,
      color: rn.node_color,
      content: (rn.node_type === "Music" || rn.node_type === "Author" || rn.node_type === "Tag") ? rn : null
    }))

    const filteredNodeIds = new Set(visibleNodes.map(rn => rn.node_id))
    const links: LinkDatum[] = []

    visibleNodes.forEach(rn => {
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
        if (filteredNodeIds.has(targetId)) {
          links.push({ source: rn.node_id, target: targetId })
        }
      })
    })

    setGraphData({ nodes, links })
  }, [visibleNodes])

  const handleLike = useCallback(() => {
    if (!currentTrack || !username || !rawNodes.length) return

    const trackNode = rawNodes.find(rn => rn.music_id === currentTrack.music_id)
    if (!trackNode) return
    const trackId = trackNode.node_id

    // Optimistic UI update
    setRawNodes(prev => {
      const userIdx = prev.findIndex(n => n.node_type === 'Author' && (n.node_name === username || n.author_name === username))
      if (userIdx === -1) return prev

      const newUserNodes = [...prev]
      const userNode = { ...newUserNodes[userIdx] }
      
      const likes = userNode.node_music_likes || []

      if (likes.includes(trackId)) {
        userNode.node_music_likes = likes.filter((id: string) => id !== trackId)
      } else {
        userNode.node_music_likes = [...likes, trackId]
      }

      newUserNodes[userIdx] = userNode
      return newUserNodes
    })

    // Persistence to DynamoDB
    fetch('/api/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, musicNodeId: trackId })
    }).catch(err => console.error('Failed to sync like to DynamoDB:', err))

  }, [currentTrack, username, rawNodes])

  const isCurrentTrackLiked = useMemo(() => {
    if (!currentTrack || !username || !rawNodes.length) return false
    const userNode = rawNodes.find(n => n.node_type === 'Author' && (n.node_name === username || n.author_name === username))
    const trackNode = rawNodes.find(rn => rn.music_id === currentTrack.music_id)
    return userNode?.node_music_likes?.includes(trackNode?.node_id || '') || false
  }, [currentTrack, username, rawNodes])

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
            config={currentConfig}
            selectedId={selectedNodeId}
            fixedNodeId={fixedNodeId}
            shouldFocus={shouldFocus}
            isLoggedIn={isLoggedIn}
            searchQuery={searchQuery}
            showSearchBar={activeTab === 'Search'}
            searchTrigger={searchTrigger}
            onNodeClick={handleNodeClick}
            onDeselect={handleDeselect}
            onSearch={handleSearch}
          />
        )}
      </div>

      {isLoggedIn && (
        <>
          {activeTab === 'Profile' && (
            (() => {
              const userNode = rawNodes.find(n => n.node_type === 'Author' && (n.node_name === username || n.author_name === username));
              return userNode ? (
                <Profile 
                  userNode={userNode} 
                  onUpdate={handleProfileUpdate} 
                  onClose={() => setActiveTab('Home')} 
                />
              ) : null;
            })()
          )}

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

          <SideNav activeTab={activeTab} onSelect={handleNavSelect} />

          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', zIndex: 100 }}>
            <PlayerBar 
              track={currentTrack} 
              autoPlay={autoPlay} 
              isLiked={isCurrentTrackLiked}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onShuffle={handleShuffle}
              onLike={handleLike}
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
