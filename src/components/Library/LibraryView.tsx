import React from 'react';
import './LibraryView.css';

interface Props {
  likedSongs: any[];
  onNodeClick: (id: string, content: any) => void;
}

const MOCK_COLLECTIONS = [
  { id: 'col-1', name: 'Me gusta', count: 0, color: '#ff5f56', icon: '❤️', type: 'likes' },
  { id: 'col-2', name: 'Rock Classics', count: 12, color: '#ffbd2e', icon: '🎸', type: 'genre' },
  { id: 'col-3', name: 'Ambient Focus', count: 8, color: '#27c93f', icon: '☁️', type: 'genre' },
];

export default function LibraryView({ likedSongs, onNodeClick }: Props) {
  
  const handleCollectionClick = (col: any) => {
    if (col.type === 'likes' && likedSongs.length > 0) {
      const firstSong = likedSongs[0];
      let content = firstSong.node_content;
      if (typeof content === 'string') try { content = JSON.parse(content) } catch {}
      onNodeClick(firstSong.node_id, content);
    }
  };

  return (
    <div className="library-container">
      <svg className="library-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="50%" y1="25%" x2="75%" y2="65%" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <line x1="50%" y1="25%" x2="25%" y2="65%" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      </svg>

      <div className="library-nodes-wrapper">
        {MOCK_COLLECTIONS.map((col, index) => {
          const positionClass = index === 0 ? 'pos-top' : index === 1 ? 'pos-right' : 'pos-left';
          
          return (
            <div 
              key={col.id} 
              className={`macos-window ${positionClass}`} 
              onClick={() => handleCollectionClick(col)}
            >
              {/* Barra de Título estilo macOS */}
              <div className="window-header">
                <div className="header-buttons">
                  <span className="dot close"></span>
                  <span className="dot minimize"></span>
                  <span className="dot expand"></span>
                </div>
                <span className="window-title-text">{col.id === 'col-1' ? 'System' : 'Folder'}</span>
              </div>

              <div className="window-content" style={{ '--window-accent': col.color } as any}>
                <div className="icon-main">{col.icon}</div>
                <h3>{col.name}</h3>
                <p>{col.id === 'col-1' ? likedSongs.length : col.count} elementos</p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="library-hint">
        ✦ Selecciona una ventana para entrar en su red
      </div>
    </div>
  );
}