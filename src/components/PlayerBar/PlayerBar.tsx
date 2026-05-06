import { useState, useRef, useCallback } from "react";
import type { Music } from "../../types/music";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import "./PlayerBar.css";

interface Props {
  track: Music | null;
  autoPlay?: boolean;
  isLiked?: boolean;
  isCommentActive?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  onShuffle?: () => void;
  onLike?: () => void;
  onCommentToggle?: () => void;
}

function formatTime(s: number): string {
  if (isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function calcRatio(e: MouseEvent | React.MouseEvent, el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
}

export default function PlayerBar({ track, autoPlay = false, isLiked = false, isCommentActive = false, onNext, onPrevious, onShuffle, onLike, onCommentToggle }: Props) {
  const { isPlaying, currentTime, duration, volume, isMuted, togglePlay, seek, changeVolume, toggleMute, restart } =
    useAudioPlayer(track, autoPlay, onNext);
  const [imgError, setImgError] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const handleLikeClick = () => {
    if (!onLike) return;
    setIsLikeAnimating(true);
    onLike();
    setTimeout(() => setIsLikeAnimating(false), 450);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handlePreviousClick = () => {
    if (currentTime > 3) {
      restart();
    } else {
      onPrevious?.();
    }
  };

  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const el = progressRef.current;
      if (!el) return;
      e.preventDefault();
      const update = (ev: MouseEvent | React.MouseEvent) => seek(calcRatio(ev as MouseEvent, el) * duration);
      update(e);
      const onMove = (ev: MouseEvent) => update(ev);
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [seek, duration]
  );

  const handleVolumeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const el = volumeRef.current;
      if (!el) return;
      e.preventDefault();
      const update = (ev: MouseEvent | React.MouseEvent) => changeVolume(calcRatio(ev as MouseEvent, el));
      update(e);
      const onMove = (ev: MouseEvent) => update(ev);
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [changeVolume]
  );

  return (
    <div className="player-bar">
      <div className="player-track-info">
        <div className="player-cover">
          {track && !imgError ? (
            <img src={track.music_cover_url} alt={track.music_album} crossOrigin="anonymous" onError={() => setImgError(true)} />
          ) : (
            <div className="player-cover-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
          )}
        </div>
        {track && (
          <div className="player-meta">
            <span className="player-title">{track.music_name}</span>
            <span className="player-author">{track.music_author}</span>
          </div>
        )}
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button className="ctrl-btn icon-btn" onClick={onShuffle} aria-label="Shuffle">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.45 20 9.5V4h-5.5zm.73 9.79l1.35 1.35 2.42-2.42 1.41 1.41-3.83 3.83-1.35-1.35-2.42 2.42-1.41-1.41 3.83-3.83z" />
            </svg>
          </button>
          <button className="ctrl-btn icon-btn" onClick={handlePreviousClick} aria-label="Previous">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button className="ctrl-btn play-btn" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M6 19h4V5H6zm8-14v14h4V5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button className="ctrl-btn icon-btn" onClick={onNext} aria-label="Next">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
          <button className="ctrl-btn icon-btn" onClick={restart} aria-label="Repeat">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
          </button>
        </div>

        <div className="player-progress-area">
          <span className="player-time">{formatTime(currentTime)}</span>
          <div ref={progressRef} className="player-progress-track" onMouseDown={handleProgressMouseDown}>
            <div className="player-progress-fill" style={{ width: `${progress}%` }}>
              <div className="player-progress-thumb" />
            </div>
          </div>
          <span className="player-time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <div className="player-social-btns">
          <button 
            className={`ctrl-btn small-btn ${isCommentActive ? 'active' : ''}`} 
            onClick={onCommentToggle} 
            aria-label="Comment"
          >
            <svg viewBox="0 0 24 24" fill={isCommentActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button 
            className={`ctrl-btn small-btn like-btn ${isLiked ? 'active' : ''} ${isLikeAnimating ? 'animating' : ''}`} 
            onClick={handleLikeClick} 
            aria-label="Like"
          >
            <svg viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button className="ctrl-btn small-btn" aria-label="Share">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
          <button className="ctrl-btn small-btn" aria-label="More options">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>

        <div className="player-volume-group">
          <button className="ctrl-btn small-btn" onClick={toggleMute} aria-label="Mute">
            {isMuted || volume === 0 ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            )}
          </button>
          <div ref={volumeRef} className="player-volume-track" onMouseDown={handleVolumeMouseDown}>
            <div className="player-volume-fill" style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}>
              <div className="player-volume-thumb" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
