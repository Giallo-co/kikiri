import React from 'react';
import './ProfileView.css';
import type { Music } from '../../types/music';

interface ProfileViewProps {
  onClose: () => void;
  onGoHome: () => void;
  onGoLibrary: () => void;
  user: {
    name: string;
    epitaph: string;
    avatar: string;
    banner: string;
  };
  likedSongs: Music[];
}

export default function ProfileView({ onClose, onGoHome, onGoLibrary, user, likedSongs }: ProfileViewProps) {
  
  return (
    <div className="profile-overlay">
      <div className="profile-container">
        {/* Botón cerrar */}
        <button className="close-profile" onClick={onClose}>✕</button>

        {/* HEADER: Tocadiscos + Banner */}
        <header className="profile-header">
          <div className="vinyl-turntable">
            <div className="vinyl-wrapper">
              <div className="vinyl-disk">
                <div className="vinyl-lines"></div>
                <div className="vinyl-center" style={{ backgroundImage: `url(${user.avatar})` }}></div>
              </div>
            </div>
          </div>
          
          <div className="banner-info">
            <div className="user-banner" style={{ backgroundImage: `url(${user.banner})` }}>
              <div className="banner-overlay"></div>
            </div>
            <div className="user-text">
              <h1>{user.name}</h1>
              <p className="epitaph">{user.epitaph}</p>
            </div>
          </div>
        </header>

        {/* SECCIÓN ME GUSTA */}
        <section className="liked-section">
          <h2>ME GUSTA ❤️</h2>
          <div className="songs-grid">
            {likedSongs.slice(0, 6).map((song) => (
              <div key={song.music_id} className="song-card">
                {/* Marco estandarizado N x Y */}
                <div className="song-image-frame">
                  <img src={song.music_cover_url} alt={song.music_name} />
                </div>
                <span className="song-title">{song.music_name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER: GIF + Espectrograma + Nav */}
        <footer className="profile-footer">
          <div className="footer-gif-frame">
            <img src="https://mir-s3-cdn-cf.behance.net/project_modules/hd/5eeea355389655.59822ff824b72.gif" alt="vibe" />
          </div>

          <div className="visualizer-area">
            <div className="spectrogram-mock">
              {[...Array(40)].map((_, i) => (
                <div key={i} className="bar" style={{ height: `${Math.random() * 100}%` }}></div>
              ))}
            </div>
          </div>

          <nav className="profile-internal-nav">
            <button onClick={onGoHome}>INICIO</button>
            <button className="disabled">EXPLORAR</button>
            <button onClick={onGoLibrary}>BIBLIOTECA</button>
          </nav>
        </footer>
      </div>
    </div>
  );
}