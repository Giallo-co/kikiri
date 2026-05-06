import { useState, useEffect, useRef } from 'react'
import GraphView from './components/GraphView'
import PlayerBar from "./components/PlayerBar/PlayerBar";
import Login from "./components/Login/Login";
import Navigation from './components/Navigation/Navigation';
import NodeInfoPanel from './components/NodeInfoPanels/NodeInfoPanel';
import SearchModal from './components/Search/SearchModal';
import LibraryView from './components/Library/LibraryView'; 
import ProfileView from './components/Profile/ProfileView'; 
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

const SHUFFLE_STEP_DELAY = 900;

interface GraphData {
  nodes: NodeDatum[]
  links: LinkDatum[]
}

const generateInitialNodes = (count: number): GraphData => {
  const nodes: NodeDatum[] = [];
  const links: LinkDatum[] = [];
  for (let i = 0; i < count; i++) {
    const v = Math.floor(Math.random() * 150) + 50;
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
  const [autoPlay, setAutoPlay] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false) 
  
  const [view, setView] = useState<'home' | 'library'>('home')
  const [activeLibraryCollection, setActiveLibraryCollection] = useState<string | null>(null);
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set())
  
  const esRef = useRef<EventSource | null>(null)
  const selectedNode = rawNodes.find(n => n.node_id === selectedNodeId) || null;

  // --- HANDLERS DE NAVEGACIÓN ---
  const handleGoHome = () => {
    setView('home');
    setSelectedNodeId(null);
    setActiveLibraryCollection(null);
    setIsProfileOpen(false); // Cerramos el perfil si se navega a home
  };

  const handleGoLibrary = () => {
    setView('library');
    setActiveLibraryCollection(null);
    setIsProfileOpen(false); // Cerramos el perfil si se navega a library
  };

  const handleOpenProfile = () => {
    setIsProfileOpen(true);
  };

  const handleEnterCollection = (collectionId: string) => {
    setActiveLibraryCollection(collectionId);
  };

  const handleToggleLike = (track: Music) => {
    setLikedSongIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(track.music_id)) {
        newSet.delete(track.music_id);
      } else {
        newSet.add(track.music_id);
      }
      return newSet;
    });
  };

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
    if (nodeId.startsWith('col-')) {
        handleEnterCollection(nodeId);
        return; 
    }
    if (content?.music_id) {
        handleTrackChange(content as Music, nodeId)
    }
    setSelectedNodeId(nodeId)
  }

  const handleDeselect = () => {
    setSelectedNodeId(null)
  }

  const getFilteredGraphData = (): GraphData | null => {
    if (!graphData) return null;
    
    if (activeLibraryCollection === 'col-1') {
      const filteredNodes = graphData.nodes.filter(node => {
        const content = node.content as any;
        return content && content.music_id && likedSongIds.has(content.music_id);
      });

      const nodeIds = new Set(filteredNodes.map(n => n.id));
      const filteredLinks = graphData.links.filter(l => {
        const sourceId = typeof l.source === 'string' ? l.source : (l.source as any).id;
        const targetId = typeof l.target === 'string' ? l.target : (l.target as any).id;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      });

      return { nodes: filteredNodes, links: filteredLinks };
    }
    return graphData;
  };

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

    if (currentNode.node_music_links?.next?.length > 0) {
      const nextId = currentNode.node_music_links.next[0]
      const nextNode = rawNodes.find(rn => rn.node_id === nextId)
      if (nextNode) {
        let nextContent = nextNode.node_content
        if (typeof nextContent === 'string') { try { nextContent = JSON.parse(nextContent) } catch {} }
        if (nextContent && (nextContent as any).music_id) {
          handleTrackChange(nextContent as Music, nextNode.node_id)
        }
      }
    }
  }

  const handlePrevious = () => {
    if (!currentTrack || !rawNodes.length) return
    const currentNode = rawNodes.find(rn => rn.node_id === selectedNodeId)
    if (!currentNode) return

    if (currentNode.node_music_links?.previous?.length > 0) {
      const prevId = currentNode.node_music_links.previous[0]
      const prevNode = rawNodes.find(rn => rn.node_id === prevId)
      if (prevNode) {
        let prevContent = prevNode.node_content
        if (typeof prevContent === 'string') { try { prevContent = JSON.parse(prevContent) } catch {} }
        if (prevContent && (prevContent as any).music_id) {
          handleTrackChange(prevContent as Music, prevNode.node_id, false)
        }
      }
    }
  }

  const handleShuffle = async () => {
    if (!rawNodes.length) return
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    const getRandom = <T,>(arr: T[]): T | null => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null

    const startFullFlow = async () => {
      const tags = rawNodes.filter(n => n.node_type === "Tag")
      const randomTag = getRandom(tags)
      if (!randomTag) return
      setSelectedNodeId(randomTag.node_id)
      await delay(SHUFFLE_STEP_DELAY)
    }
    await startFullFlow()
  }

  useEffect(() => {
    if (!isLoggedIn) return;
    const connect = () => {
      const es = new EventSource('/api/nodes/stream')
      esRef.current = es
      es.onopen = () => { setConnected(true); setError(null); }
      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          if (parsed.__type === 'track') {
            const track = parsed.track as Music
            if (track && track.music_id) setCurrentTrack(track)
            return
          }
          const incomingNodes: RawNode[] = parsed
          if (Array.isArray(incomingNodes) && incomingNodes.length) {
            setRawNodes(incomingNodes)
            const nodes: NodeDatum[] = incomingNodes.map(rn => {
              let content = rn.node_content
              if (typeof content === 'string') { try { content = JSON.parse(content) } catch {} }
              return { id: rn.node_id, name: rn.node_name, color: rn.color, content }
            })
            const links: LinkDatum[] = []
            const nodeIds = new Set(incomingNodes.map(rn => rn.node_id))
            incomingNodes.forEach(rn => {
              const allLinks = [
                ...(rn.node_tag_links?.next || []), ...(rn.node_tag_links?.previous || []),
                ...(rn.node_music_links?.next || []), ...(rn.node_music_links?.previous || []),
                ...(rn.node_author_links?.next || []), ...(rn.node_author_links?.previous || []),
                ...(rn.node_album_links?.next || []), ...(rn.node_album_links?.previous || [])
              ]
              allLinks.forEach(targetId => { if (nodeIds.has(targetId)) links.push({ source: rn.node_id, target: targetId }) })
            })
            setGraphData({ nodes, links })
          }
        } catch (e) { setError('parse error') }
      }
      es.onerror = () => { setConnected(false); setError('connection error'); es.close(); setTimeout(connect, 2000); }
    }
    connect(); return () => { esRef.current?.close() }
  }, [isLoggedIn])

  // --- LÓGICA DE FILTRADO PARA LA VISTA Y BÚSQUEDA ---
  const currentDisplayData = activeLibraryCollection ? getFilteredGraphData() : graphData;

  const searchNodes = activeLibraryCollection && currentDisplayData 
    ? rawNodes.filter(rn => {
        const isInView = currentDisplayData.nodes.some(n => n.id === rn.node_id);
        const isMusic = rn.node_type === 'Music'; 
        return isInView && isMusic;
      })
    : rawNodes;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: '#111' }}>
      
      {(!isLoggedIn || isTransitioning) && (
        <Login onLogin={handleLoginSuccess} isTransitioning={isTransitioning} />
      )}

      <div style={{ width: '100%', height: '100%' }}>
        {view === 'home' || activeLibraryCollection ? (
          currentDisplayData && (
            <>
              <GraphView
                nodes={currentDisplayData.nodes}
                links={currentDisplayData.links}
                config={graphConfig}
                selectedId={selectedNodeId}
                onNodeClick={handleNodeClick}
                onDeselect={handleDeselect}
              />
              {activeLibraryCollection && (
                <button 
                  onClick={handleGoLibrary}
                  style={{
                    position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 200, padding: '10px 20px', borderRadius: '20px',
                    backgroundColor: 'rgba(20, 20, 20, 0.8)', color: 'white', 
                    border: '1px solid rgba(0, 242, 255, 0.5)',
                    cursor: 'pointer', backdropFilter: 'blur(10px)',
                    fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase'
                  }}
                >
                  ← Volver a Biblioteca
                </button>
              )}
            </>
          )
        ) : (
          <LibraryView 
            likedSongs={rawNodes.filter(n => {
                let content = n.node_content;
                if (typeof content === 'string') try { content = JSON.parse(content) } catch {}
                return content && likedSongIds.has((content as any).music_id);
            })}
            onNodeClick={handleNodeClick}
          />
        )}
      </div>

      {isLoggedIn && (
        <>
          <Navigation 
            onHomeClick={handleGoHome} 
            onSearchClick={() => setIsSearchOpen(true)}
            onLibraryClick={handleGoLibrary}
            onProfileClick={handleOpenProfile} 
            currentView={isProfileOpen ? 'profile' : (activeLibraryCollection ? 'library' : view)} 
          />

          <SearchModal 
            isOpen={isSearchOpen} 
            onClose={() => setIsSearchOpen(false)}
            nodes={searchNodes} 
            onSelect={handleNodeClick}
            currentView={activeLibraryCollection ? 'library' : view} 
          />

          {isProfileOpen && (
            <ProfileView 
              onClose={() => setIsProfileOpen(false)}
              onGoHome={handleGoHome}
              onGoLibrary={handleGoLibrary}
              user={{
                name: "Usuario prueba 1",
                epitaph: "Explorando las frecuencias del vacío. El sonido es la única constante.",
                avatar: "https://www.nutrisslovers.com/Portals/nutrisslovers/Articulos%20Nutriss%20Gatos/gatos-unicos-guia-de-razas-y-como-nutrir-su-mundo/cuales-son-las-razas-de-gatos-mas-populares-en-colombia.jpg?ver=T9w4YcvobP-L1GXta8uTAA%3D%3D", // Avatar demo
                banner: "https://img.freepik.com/foto-gratis/personaje-estilo-anime-espacio_23-2151134346.jpg?semt=ais_hybrid&w=740&q=80" // Banner demo
              }}
              likedSongs={rawNodes
                .filter(n => {
                  let content = n.node_content;
                  if (typeof content === 'string') try { content = JSON.parse(content) } catch {}
                  return content && likedSongIds.has((content as any).music_id);
                })
                .map(n => {
                  let content = n.node_content;
                  if (typeof content === 'string') try { content = JSON.parse(content) } catch {}
                  return content as Music;
                })
              }
            />
          )}

          {(view === 'home' || activeLibraryCollection) && !isProfileOpen && (
            <NodeInfoPanel selectedNode={selectedNode} />
          )}

          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', zIndex: 100 }}>
            <PlayerBar 
              track={currentTrack} 
              autoPlay={autoPlay} 
              onNext={handleNext}
              onPrevious={handlePrevious}
              onShuffle={handleShuffle}
              isLiked={likedSongIds.has(currentTrack?.music_id || "")}
              onToggleLike={handleToggleLike}
            />
          </div>
        </>
      )}
    </div>
  )
}