import React from 'react';
import './LibraryView.css';

interface Props {
  likedSongs: any[];
  onNodeClick: (id: string, content: any) => void;
}

const MOCK_COLLECTIONS = [
  { id: 'col-1', name: 'Me gusta', count: 0, color: '#ff4b4b', icon: '❤️' },
  { id: 'col-2', name: 'Rock Classics', count: 12, color: '#ff9800', icon: '🎸' },
  { id: 'col-3', name: 'Ambient Focus', count: 8, color: '#00bcd4', icon: '☁️' },
];

export default function LibraryView({ likedSongs }: Props) {
  return (
    <div className="library-container">
      <div className="library-grid">
        {/* SVG para las líneas de interconexión (estilo grafo) */}
        <svg className="library-connections">
          <line x1="20%" y1="50%" x2="50%" y2="50%" stroke="rgba(255,255,255,0.1)" />
          <line x1="50%" y1="50%" x2="80%" y2="50%" stroke="rgba(255,255,255,0.1)" />
        </svg>

        {MOCK_COLLECTIONS.map((col) => (
          <div key={col.id} className="library-card" style={{ '--card-color': col.color } as any}>
            <div className="card-content">
              <span className="card-icon">{col.id === 'col-1' ? '❤️' : col.icon}</span>
              <h3>{col.name}</h3>
              <p>{col.id === 'col-1' ? likedSongs.length : col.count} elementos</p>
            </div>
            <div className="card-glow" />
          </div>
        ))}
      </div>
      
      <div className="library-hint">
        Selecciona una colección para explorar sus nodos
      </div>
    </div>
  );
}