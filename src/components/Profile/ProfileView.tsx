import React, { useEffect, useRef } from 'react';
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

        {/* HEADER: Vinilo + Banner */}
        <header className="profile-header">
          <div className="vinyl-wrapper">
            <div className="vinyl-disk">
              <div className="vinyl-lines"></div>
              <div className="vinyl-center" style={{ backgroundImage: `url(${user.avatar})` }}></div>
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
                <img src={song.music_cover_url} alt={song.music_name} />
                <span>{song.music_name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER: GIF + Espectrograma + Nav */}
        <footer className="profile-footer">
          <div className="footer-gif">
            {/* Aquí puedes poner un GIF de tu elección */}
            <img src="https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJueGZ3bmZ3bmZ3bmZ3/l41lTf7FpXjW/giphy.gif" alt="vibe" />
          </div>

          <div className="visualizer-area">
            <div className="spectrogram-mock">
              {/* Generamos barritas aleatorias para el espectrograma */}
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