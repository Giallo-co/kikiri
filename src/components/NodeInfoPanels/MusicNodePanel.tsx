import React from 'react';
import { Music } from '../../types/music';

interface MusicNodePanelProps {
  data: Music;
}

const MusicNodePanel: React.FC<MusicNodePanelProps> = ({ data }) => {
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

      {/* Placeholder del Espectrograma - Explicación abajo */}
      <div className="spectrogram-placeholder">
        [ SPECTROGRAM_WAVEFORM ]
      </div>
    </div>
  );
};

export default MusicNodePanel;