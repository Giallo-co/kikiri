import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GraphView from './components/GraphView'
import PlayerBar from "./components/PlayerBar/PlayerBar";
import SideNav, { NavItem } from "./components/SideNav/SideNav";
import Login from "./components/Login/Login";
import Profile from "./components/Profile/Profile";
import Post from "./components/Post/Post";
import CustomCursor from "./components/CustomCursor/CustomCursor";
import { graphConfig } from './graphConfig'
import type { NodeDatum, LinkDatum, RawNode } from './types/graph'
import type { Music } from "./types/music";

/**
 * Base HTTPS pública del media (bucket S3 público o CloudFront). Sin barra final.
 * Las keys deben coincidir: `music/...`, `music-cover/...`.
 * En Amplify se configura como variable de entorno `VITE_MEDIA_BASE_URL` por branch.
 */
const MEDIA_BASE_URL = ((import.meta.env.VITE_MEDIA_BASE_URL as string | undefined) ?? '')
  .trim()
  .replace(/\/$/, '');

const DEFAULT_TRACK: Music = {
  music_id: "59",
  music_name: "Key",
  music_description: "Key from C418",
  music_author: "C418",
  music_cover_url: MEDIA_BASE_URL ? `${MEDIA_BASE_URL}/music-cover/c418/volume-alpha.jpg` : '',
  music_url: MEDIA_BASE_URL ? `${MEDIA_BASE_URL}/music/c418/volume-alpha/01-key.mp4` : '',
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

export default function App() {
  const forceAuthOnly = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('auth') === '1'
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<NavItem>('Home')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [rawNodes, setRawNodes] = useState<RawNode[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<Music>(DEFAULT_TRACK)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isManualSelection, setIsManualSelection] = useState(false)
  const [shouldFocus, setShouldFocus] = useState(true)
  const [isCommentActive, setIsCommentActive] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTrigger, setSearchTrigger] = useState(0)
  const [currentConfig, setCurrentConfig] = useState(graphConfig)
  const esRef = useRef<EventSource | null>(null)
  const initialSearchHandledRef = useRef(false)

  const visibleNodes = useMemo(() => {
    if (!rawNodes.length) return []
    
    // IF NOT LOGGED IN: Show all music nodes for the background
    if (!isLoggedIn || !username) {
      return rawNodes.filter(rn => rn.node_type === 'Music')
    }

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
        const matches = rawNodes.filter(rn => 
          (rn.node_name?.toLowerCase().includes(q)) ||
          (rn.music_author?.toLowerCase().includes(q)) ||
          (rn.music_description?.toLowerCase().includes(q)) ||
          (rn.author_real_name?.toLowerCase().includes(q)) ||
          (rn.author_name?.toLowerCase().includes(q))
        )

        if (matches.length === 1 && (matches[0].node_type === 'Author' || matches[0].node_type === 'Tag')) {
          const reachableIds = getReachableFrom([matches[0]], 1)
          return rawNodes.filter(rn => reachableIds.has(rn.node_id))
        }

        return matches
      } else {
        // Union of Home and Explore: basically everything reachable
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

    if (baseNode.node_album_links_next?.length > 0) {
      const nextId = baseNode.node_album_links_next[0]
      const nextNode = visibleNodes.find(rn => rn.node_id === nextId)
      if (nextNode && nextNode.node_type === "Music") {
        handleTrackChange(nextNode as unknown as Music, nextNode.node_id, true, isManualSelection)
        return
      }
    }

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

    if (baseNode.node_author_links_next?.length > 0) {
      const authorId = baseNode.node_author_links_next[0]
      if (visibleNodes.some(n => n.node_id === authorId)) {
        setSelectedNodeId(authorId)
        setShouldFocus(isManualSelection)
      }
    }
  }, [currentTrack, visibleNodes, selectedNodeId, isManualSelection, handleTrackChange])

  const playingNodeId = useMemo(() => {
    if (!currentTrack) return null
    const node = visibleNodes.find(rn => rn.music_id === currentTrack.music_id)
    return node?.node_id || null
  }, [currentTrack, visibleNodes])

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

    const startFullFlow = async (): Promise<boolean> => {
      const tags = visibleNodes.filter(n => n.node_type === "Tag" && (n.node_author_links_next?.length ?? 0) > 0)
      const randomTag = getRandom(tags.length > 0 ? tags : visibleNodes.filter(n => n.node_type === "Tag"))
      
      if (!randomTag) {
        // Fallback for searches with no tags: pick a random author or music
        const authors = visibleNodes.filter(n => n.node_type === "Author")
        const musics = visibleNodes.filter(n => n.node_type === "Music")
        const fallback = getRandom(authors) || getRandom(musics) || getRandom(visibleNodes)
        if (!fallback) return false
        
        setSelectedNodeId(fallback.node_id)
        setShouldFocus(true)
        if (fallback.node_type === "Music") {
          handleTrackChange(fallback as unknown as Music, fallback.node_id, true, true)
          return true
        }
        // If it's an author, wait a bit then pick a music
        await delay(SHUFFLE_STEP_DELAY)
        const randomMusic = findMusicFromAuthor(fallback)
        if (randomMusic) {
          handleTrackChange(randomMusic as unknown as Music, randomMusic.node_id, true, true)
        }
        return true
      }

      setSelectedNodeId(randomTag.node_id)
      setShouldFocus(true)
      await delay(SHUFFLE_STEP_DELAY)

      const randomAuthor = findAuthorFromTag(randomTag)
      if (!randomAuthor) return await startFullFlow()

      setSelectedNodeId(randomAuthor.node_id)
      setShouldFocus(true)
      await delay(SHUFFLE_STEP_DELAY)

      const randomMusic = findMusicFromAuthor(randomAuthor)
      if (!randomMusic) return await startFullFlow()

      handleTrackChange(randomMusic as unknown as Music, randomMusic.node_id, true, true)
      return true
    }

    if (!currentNode) {
      await startFullFlow()
      return
    }

    if (currentNode.node_type === "Tag") {
      const randomAuthor = findAuthorFromTag(currentNode)
      if (!randomAuthor) { await startFullFlow(); return }
      setSelectedNodeId(randomAuthor.node_id); setShouldFocus(true); await delay(SHUFFLE_STEP_DELAY)
      const randomMusic = findMusicFromAuthor(randomAuthor)
      if (!randomMusic) { await startFullFlow(); return }
      handleTrackChange(randomMusic as unknown as Music, randomMusic.node_id, true, true)
      return
    }

    if (currentNode.node_type === "Author") {
      const randomMusic = findMusicFromAuthor(currentNode)
      if (!randomMusic) { await startFullFlow(); return }
      handleTrackChange(randomMusic as unknown as Music, randomMusic.node_id, true, true)
      return
    }

    if (currentNode.node_type === "Music") {
      const relatedIds = [...(currentNode.node_tag_links_next || []), ...(currentNode.node_author_links_next || [])]
      const relatedNodes = visibleNodes.filter(n => relatedIds.includes(n.node_id))
      const randomRelated = getRandom(relatedNodes)
      if (!randomRelated) { await startFullFlow(); return }
      setSelectedNodeId(randomRelated.node_id); setShouldFocus(true); await delay(SHUFFLE_STEP_DELAY)
      if (randomRelated.node_type === "Tag") {
        const randomAuthor = findAuthorFromTag(randomRelated)
        if (!randomAuthor) { await startFullFlow(); return }
        setSelectedNodeId(randomAuthor.node_id); setShouldFocus(true); await delay(SHUFFLE_STEP_DELAY)
        const randomMusic = findMusicFromAuthor(randomAuthor)
        if (!randomMusic) { await startFullFlow(); return }
        handleTrackChange(randomMusic as unknown as Music, randomMusic.node_id, true, true)
      } else if (randomRelated.node_type === "Author") {
        const randomMusic = findMusicFromAuthor(randomRelated)
        if (!randomMusic) { await startFullFlow(); return }
        handleTrackChange(randomMusic as unknown as Music, randomMusic.node_id, true, true)
      }
      return
    }
  }, [visibleNodes, selectedNodeId, handleTrackChange])

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
    setIsCommentActive(false)
  }, [])

  const handleCommentToggle = useCallback(() => {
    if (selectedNodeId) {
      setIsCommentActive(prev => !prev)
    }
  }, [selectedNodeId])

  const handleShare = useCallback(() => {
    if (!currentTrack) return
    const shareUrl = `${window.location.origin}${window.location.pathname}?search=${encodeURIComponent(currentTrack.music_name)}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsSharing(true)
      setTimeout(() => setIsSharing(false), 600)
    }).catch(err => {
      console.error('Failed to copy:', err)
    })
  }, [currentTrack])

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
      if (match.node_type === 'Music') {
        setSelectedNodeId(match.node_id); 
        setIsManualSelection(true); 
        setShouldFocus(true)
        handleTrackChange(match as unknown as Music, match.node_id, true, true)
      } else {
        // For Author or Tag, we don't just select it, we want to see its neighborhood
        setSelectedNodeId(match.node_id);
        setIsManualSelection(true);
        setShouldFocus(true);
        
        // The visibleNodes memo will handle showing the reachable nodes 
        // because it uses activeTab === 'Search' logic.
        // However, we need to ensure the search results visible list 
        // includes the related nodes if it's a single match of Author/Tag.
      }
    }
  }, [rawNodes, handleTrackChange])

  useEffect(() => {
    if (!searchQuery) { setCurrentConfig(graphConfig); return }
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
      setCurrentConfig(prev => ({ ...prev, outerExclusionRadius: matches.length * 5 }))
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
        ...(rn.node_tag_links_next || []), ...(rn.node_tag_links_previous || []),
        ...(rn.node_music_links_next || []), ...(rn.node_music_links_previous || []),
        ...(rn.node_author_links_next || []), ...(rn.node_author_links_previous || []),
        ...(rn.node_album_links_next || []), ...(rn.node_album_links_previous || [])
      ]
      allLinks.forEach(targetId => {
        if (filteredNodeIds.has(targetId)) links.push({ source: rn.node_id, target: targetId })
      })
    })
    setGraphData({ nodes, links })
  }, [visibleNodes])

  const handleLike = useCallback(() => {
    if (!currentTrack || !username || !rawNodes.length) return
    const trackNode = rawNodes.find(rn => rn.music_id === currentTrack.music_id)
    if (!trackNode) return
    const trackId = trackNode.node_id
    setRawNodes(prev => {
      const userIdx = prev.findIndex(n => n.node_type === 'Author' && (n.node_name === username || n.author_name === username))
      if (userIdx === -1) return prev
      const newUserNodes = [...prev]; const userNode = { ...newUserNodes[userIdx] }
      const likes = userNode.node_music_likes || []
      if (likes.includes(trackId)) userNode.node_music_likes = likes.filter((id: string) => id !== trackId)
      else userNode.node_music_likes = [...likes, trackId]
      newUserNodes[userIdx] = userNode; return newUserNodes
    })
    fetch('/api/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, musicNodeId: trackId })
    }).catch(err => console.error('Failed to sync like:', err))
  }, [currentTrack, username, rawNodes])

  const isCurrentTrackLiked = useMemo(() => {
    if (!currentTrack || !username || !rawNodes.length) return false
    const userNode = rawNodes.find(n => n.node_type === 'Author' && (n.node_name === username || n.author_name === username))
    const trackNode = rawNodes.find(rn => rn.music_id === currentTrack.music_id)
    return userNode?.node_music_likes?.includes(trackNode?.node_id || '') || false
  }, [currentTrack, username, rawNodes])

  useEffect(() => {
    let cancelled = false
    const retryRef = { ms: 2000 }
    const maxRetryMs = 60_000

    const streamUrl = (() => {
      const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '').trim() ?? ''
      return base ? `${base}/api/nodes/stream` : '/api/nodes/stream'
    })()

    const connect = () => {
      if (cancelled) return
      const es = new EventSource(streamUrl)
      esRef.current = es
      es.onopen = () => {
        setConnected(true)
        setError(null)
        retryRef.ms = 2000
      }
      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          if (parsed.__type === 'track') {
            const track = parsed.track as Music
            if (track && track.music_id) setCurrentTrack(track)
            return
          }
          const incomingNodes: RawNode[] = parsed
          if (Array.isArray(incomingNodes) && incomingNodes.length) setRawNodes(incomingNodes)
        } catch (e) {
          setError('parse error')
        }
      }
      es.onerror = () => {
        setConnected(false)
        setError('connection error')
        es.close()
        const wait = retryRef.ms
        retryRef.ms = Math.min(maxRetryMs, Math.floor(retryRef.ms * 1.5))
        setTimeout(() => {
          if (!cancelled) connect()
        }, wait)
      }
    }
    connect()
    return () => {
      cancelled = true
      esRef.current?.close()
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn && rawNodes.length > 0 && !initialSearchHandledRef.current) {
      const params = new URLSearchParams(window.location.search)
      const query = params.get('search')
      if (query) {
        handleSearch(query)
        setActiveTab('Search')
        setSearchTrigger(prev => prev + 1)
        
        // Remove search param from URL without refreshing
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
      initialSearchHandledRef.current = true
    }
  }, [isLoggedIn, rawNodes, handleSearch])

  if (forceAuthOnly) {
    return (
      <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: '#ebebeb' }}>
        <CustomCursor />
        <Login onLogin={handleLoginSuccess} isTransitioning={isTransitioning} />
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: '#ebebeb' }}>
      <CustomCursor />
      {(!isLoggedIn || isTransitioning) && (
        <Login onLogin={handleLoginSuccess} isTransitioning={isTransitioning} />
      )}

      <div style={{ width: '100%', height: '100%', pointerEvents: (activeTab === 'Profile' || activeTab === 'Post') ? 'none' : 'auto' }}>
        {graphData && (
          <GraphView
            nodes={graphData.nodes}
            links={graphData.links}
            config={currentConfig}
            selectedId={selectedNodeId}
            playingNodeId={playingNodeId}
            fixedNodeId={fixedNodeId}
            shouldFocus={shouldFocus}
            showComment={isCommentActive}
            isLoggedIn={isLoggedIn}
            centerBackground={!isLoggedIn}
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

          {activeTab === 'Post' && (
            <Post 
              username={username || ''} 
              onClose={() => setActiveTab('Home')} 
              onSuccess={() => setActiveTab('Home')}
            />
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
              isCommentActive={isCommentActive}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onShuffle={handleShuffle}
              onLike={handleLike}
              onCommentToggle={handleCommentToggle}
              onShare={handleShare}
              isSharing={isSharing}
            />
          </div>
        </>
      )}
    </div>
  )
}
