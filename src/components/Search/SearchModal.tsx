import React, { useState, useEffect } from 'react';
import { RawNode } from '../../types/graph';

// Definimos las colecciones que existen en tu LibraryView para que el buscador las reconozca
const LIBRARY_COLLECTIONS = [
  { id: 'col-1', name: 'Me gusta', icon: '❤️', type: 'Folder' },
  { id: 'col-2', name: 'Rock Classics', icon: '🎸', type: 'Folder' },
  { id: 'col-3', name: 'Ambient Focus', icon: '☁️', type: 'Folder' },
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: RawNode[];
  onSelect: (nodeId: string, content: any) => void;
  currentView: 'home' | 'library'; // Nueva prop para saber dónde estamos
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, nodes, onSelect, currentView }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
      return;
    }

    const searchTerm = query.toLowerCase();

    if (currentView === 'library') {
      // --- LÓGICA PARA BIBLIOTECA ---
      // Buscamos en las carpetas/ventanas macOS
      const filteredCols = LIBRARY_COLLECTIONS.filter(col => 
        col.name.toLowerCase().includes(searchTerm)
      ).map(col => ({
        node_id: col.id,
        node_name: col.name,
        node_type: 'Library',
        node_content: { music_author: col.type, icon: col.icon }
      }));
      setResults(filteredCols);
    } else {
      // --- LÓGICA PARA INICIO (Grafo) ---
      const filtered = nodes.filter(n => 
        n.node_type === 'Music' && (
          n.node_name.toLowerCase().includes(searchTerm) ||
          (n.node_content as any)?.music_author?.toLowerCase().includes(searchTerm)
        )
      ).slice(0, 6);
      setResults(filtered);
    }
  }, [query, nodes, currentView]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        paddingTop: '15vh', zIndex: 1000
      }} 
      onClick={onClose}
    >
      <div 
        style={{
          width: '600px', backgroundColor: 'rgba(25, 25, 25, 0.95)',
          borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.8)', overflow: 'hidden'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <input
          autoFocus
          placeholder={currentView === 'library' ? "Buscar en carpetas..." : "Buscar canciones o artistas..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '22px 28px', fontSize: '18px',
            background: 'transparent', border: 'none', color: 'white',
            outline: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
            fontFamily: 'inherit'
          }}
        />
        
        <div style={{ padding: '8px 0', maxHeight: '400px', overflowY: 'auto' }}>
          {results.map(node => (
            <div
              key={node.node_id}
              onClick={() => { onSelect(node.node_id, node.node_content); onClose(); }}
              style={{
                padding: '14px 28px', cursor: 'pointer', display: 'flex', 
                justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '20px' }}>
                  {currentView === 'library' ? node.node_content.icon : '🎵'}
                </span>
                <div>
                  <div style={{ color: 'white', fontWeight: 500, fontSize: '15px' }}>{node.node_name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                    {(node.node_content as any)?.music_author}
                  </div>
                </div>
              </div>
              
              <span style={{ 
                color: currentView === 'library' ? '#00f2ff' : '#ab90df', 
                fontSize: '10px', 
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 'bold',
                padding: '4px 8px',
                borderRadius: '4px',
                background: 'rgba(255,255,255,0.03)'
              }}>
                {currentView === 'library' ? 'Ventana' : 'Canción'}
              </span>
            </div>
          ))}

          {query && results.length === 0 && (
            <div style={{ padding: '40px 20px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontSize: '14px' }}>
              No se encontraron coincidencias en {currentView === 'library' ? 'tu biblioteca' : 'el grafo'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;