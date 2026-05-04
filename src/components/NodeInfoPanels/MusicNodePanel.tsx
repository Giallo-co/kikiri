import React, { useState, useEffect } from 'react';
import { Music } from '../../types/music';

const fakeSpectrogramStyles = `
  @keyframes soundWave {
    0%, 100% { height: 8px; opacity: 0.5; }
    50% { height: 45px; opacity: 1; }
  }

  .spectrogram-bar {
    width: 3px;
    background-color: #3498db;
    border-radius: 2px;
    transition: height 0.3s ease;
  }

  .animating .spectrogram-bar {
    animation: soundWave 1.2s infinite ease-in-out;
  }
`;

interface MusicNodePanelProps {
  data: Music;
  isPlaying?: boolean;
}

const MusicNodePanel: React.FC<MusicNodePanelProps> = ({ data, isPlaying: propIsPlaying }) => {
  const [internalPlaying, setInternalPlaying] = useState(true);
  const activePlaying = propIsPlaying !== undefined ? propIsPlaying : internalPlaying;
  const bars = Array.from({ length: 35 });

  useEffect(() => {
    setInternalPlaying(true);
  }, [data.music_name]);

  return (
    <div className="info-card music-card">
      <style>{fakeSpectrogramStyles}</style>

      <div className="header" style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <img 
          src={data.music_cover_url} 
          alt={data.music_name} 
          style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover' }} 
        />
        <div className="titles">
          <h3 style={{ margin: 0, fontSize: '18px', color: 'white' }}>{data.music_name}</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#aaa' }}>{data.music_author || 'Artista desconocido'}</p>
        </div>
      </div>
      
      {/* RESTAURADOS: Los tres tags originales */}
      <div className="meta-info" style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span className="tag" style={{ background: '#222', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#ccc' }}>
          Álbum: {data.music_album}
        </span>
        <span className="tag" style={{ background: '#222', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#ccc' }}>
          {data.music_genre || 'Genre'}
        </span>
        <span className="tag" style={{ background: '#222', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#ccc' }}>
          {data.music_year || '2023'}
        </span>
      </div>

      <div 
        className={`spectrogram-container ${activePlaying ? 'animating' : ''}`}
        onClick={() => setInternalPlaying(!internalPlaying)}
        style={{ 
          background: 'rgba(0, 0, 0, 0.3)', 
          borderRadius: '6px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          overflow: 'hidden',
          padding: '0 8px',
          cursor: 'pointer'
        }}
      >
        {bars.map((_, index) => (
          <div 
            key={index} 
            className="spectrogram-bar" 
            style={{ 
              animationDelay: `${Math.random() * -1.2}s`,
              height: activePlaying ? '15px' : '6px',
              // Congela la animación visualmente cuando no está en play
              animationPlayState: activePlaying ? 'running' : 'paused'
            }} 
          />
        ))}
      </div>
      <p style={{ fontSize: '9px', color: '#444', textAlign: 'center', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {activePlaying ? '● Animación activa' : '○ Animación pausada'}
      </p>
    </div>
  );
};

export default MusicNodePanel;