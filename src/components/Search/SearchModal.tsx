import React, { useState, useEffect } from 'react';
import { RawNode } from '../../types/graph';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: RawNode[];
  onSelect: (nodeId: string, content: any) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, nodes, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RawNode[]>([]);

  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
      return;
    }
    const filtered = nodes.filter(n => 
      n.node_type === 'Music' && (
        n.node_name.toLowerCase().includes(query.toLowerCase()) ||
        (n.node_content as any)?.music_author?.toLowerCase().includes(query.toLowerCase())
      )
    ).slice(0, 6); // Limitamos a 6 resultados
    setResults(filtered);
  }, [query, nodes]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      paddingTop: '15vh', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        width: '600px', backgroundColor: 'rgba(30, 30, 30, 0.85)',
        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Buscar canciones o artistas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '18px 24px', fontSize: '20px',
            background: 'transparent', border: 'none', color: 'white',
            outline: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}
        />
        <div style={{ padding: '8px 0' }}>
          {results.map(node => (
            <div
              key={node.node_id}
              onClick={() => { onSelect(node.node_id, node.node_content); onClose(); }}
              style={{
                padding: '12px 24px', cursor: 'pointer', display: 'flex', 
                justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div>
                <div style={{ color: 'white', fontWeight: 500 }}>{node.node_name}</div>
                <div style={{ color: '#888', fontSize: '12px' }}>{(node.node_content as any)?.music_author}</div>
              </div>
              <span style={{ color: '#ab90df', fontSize: '11px', textTransform: 'uppercase' }}>Canción</span>
            </div>
          ))}
          {query && results.length === 0 && (
            <div style={{ padding: '20px', color: '#555', textAlign: 'center' }}>No se encontraron resultados</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;