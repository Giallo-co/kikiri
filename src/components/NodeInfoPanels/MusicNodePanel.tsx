import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Music } from '../../types/music';

interface MusicNodePanelProps {
  data: Music;
}

const MusicNodePanel: React.FC<MusicNodePanelProps> = ({ data }) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    // Inicializa el espectrograma solo si existe el contenedor y la URL del audio
    if (waveformRef.current && data.music_url) {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }

      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#3498db', // Color azul de la onda
        progressColor: '#00f2ff',
        barWidth: 2,
        barGap: 3,
        barRadius: 2,
        height: 60,
        normalize: true,
        cursorColor: 'transparent',
      });

      wavesurfer.current.load(data.music_url);
    }

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [data.music_url]);

  return (
    <div className="info-card music-card">
      <div className="header">
        <img src={data.music_cover_url} alt={data.music_name} className="cover-image" />
        <div className="titles">
          <h3>{data.music_name}</h3>
          <p>{data.music_author}</p>
        </div>
      </div>
      
      <div className="meta-info">
        <span className="tag">Álbum: {data.music_album}</span>
        {data.music_genre && <span className="tag">{data.music_genre}</span>}
        {data.music_year && <span className="tag">{data.music_year}</span>}
      </div>

      {/* Contenedor del Espectrograma dinámico debajo de los tags */}
      <div 
        className="spectrogram-container" 
        ref={waveformRef}
        style={{ 
          marginTop: '12px',
          background: 'rgba(0, 0, 0, 0.2)', 
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      >
        {/* WaveSurfer renderiza la onda aquí automáticamente */}
      </div>
    </div>
  );
};

export default MusicNodePanel;