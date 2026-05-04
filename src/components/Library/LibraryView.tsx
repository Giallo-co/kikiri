import React, { useState, useRef } from 'react';
import './LibraryView.css';

interface Props {
  likedSongs: any[];
  onNodeClick: (id: string, content: any) => void;
}

const COLLECTIONS = [
  { id: 'col-1', name: 'Me gusta', count: 0, color: '#ff5f56', icon: '❤️', x: 0, y: -150 },
  { id: 'col-2', name: 'Rock Classics', count: 12, color: '#ffbd2e', icon: '🎸', x: 200, y: 150 },
  { id: 'col-3', name: 'Ambient Focus', count: 8, color: '#27c93f', icon: '☁️', x: -200, y: 150 },
];

export default function LibraryView({ likedSongs, onNodeClick }: Props) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lógica de Zoom (Rueda del ratón)
  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(transform.scale + delta, 0.5), 2);
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  // Lógica de Movimiento (Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Solo iniciamos el arrastre si hacemos clic en el fondo del viewport
    if ((e.target as HTMLElement).classList.contains('library-viewport')) {
      setIsDragging(true);
    }
  };
  
  const handleMouseUp = () => setIsDragging(false);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: prev.x + e.movementX,
      y: prev.y + e.movementY
    }));
  };

  return (
    <div 
      className="library-viewport"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      ref={containerRef}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <div 
        className="library-canvas"
        style={{
          transform: `translate(calc(50% + ${transform.x}px), calc(50% + ${transform.y}px)) scale(${transform.scale})`
        }}
      >
        {/* Líneas de conexión decorativas */}
        <svg className="canvas-connections" style={{ position: 'absolute', width: '1000px', height: '1000px', top: '-500px', left: '-500px', pointerEvents: 'none' }}>
          <path d="M 500 350 Q 600 500, 700 650" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          <path d="M 500 350 Q 400 500, 300 650" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          <line x1="300" y1="650" x2="700" y2="650" stroke="rgba(255,255,255,0.05)" strokeDasharray="5,5" />
        </svg>

        {COLLECTIONS.map((col) => (
          <div 
            key={col.id} 
            className="macos-window"
            style={{ 
              left: col.x, 
              top: col.y,
              transform: 'translate(-50%, -50%)',
              position: 'absolute'
            }}
            onClick={(e) => {
              e.stopPropagation(); // Evita que el clic se propague al fondo
              // Llamamos a la función que ahora en App.tsx maneja la entrada a la colección
              onNodeClick(col.id, { isCollection: true, name: col.name });
            }}
          >
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
              <p>
                {col.id === 'col-1' ? likedSongs.length : col.count} elementos
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="library-hint" style={{
        position: 'absolute',
        bottom: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '12px',
        pointerEvents: 'none',
        textTransform: 'uppercase',
        letterSpacing: '2px'
      }}>
        Escala con la rueda • Arrastra para mover
      </div>
    </div>
  );
}