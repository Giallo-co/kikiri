import type { Song } from "../../data/mockMusic";

type Props = {
  currentSong: Song | null;
};

export default function PlayerBar({ currentSong }: Props) {
  return (
    <footer className="player-bar">
      <div className="player-left">
        <div
          className="song-cover"
          style={{
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.95), rgba(34,211,238,0.95))",
          }}
        >
          {currentSong ? currentSong.title.slice(0, 2).toUpperCase() : "--"}
        </div>

        <div>
          <p className="song-title" style={{ margin: 0 }}>
            {currentSong ? currentSong.title : "No song selected"}
          </p>
          <p className="song-subtitle" style={{ margin: 0 }}>
            {currentSong ? currentSong.artist : "Selecciona una canción"}
          </p>
        </div>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button className="icon-btn">⏮</button>
          <button className="icon-btn">▶</button>
          <button className="icon-btn">⏭</button>
        </div>

        <div className="progress">
          <div className="progress-fill" />
        </div>
      </div>

      <div className="player-right">
        <span className="muted">{currentSong ? currentSong.duration : "0:00"}</span>
      </div>
    </footer>
  );
}