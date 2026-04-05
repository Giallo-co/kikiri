import type { Song } from "../../types/music";

type QuickPicksProps = {
  songs: Song[];
  currentSongId: string;
  isPlaying: boolean;
  likedSongIds: string[];
  onSelectSong: (songId: string) => void;
  onToggleLike: (songId: string) => void;
  onPlayAll: () => void;
};

export default function QuickPicks({
  songs,
  currentSongId,
  isPlaying,
  likedSongIds,
  onSelectSong,
  onToggleLike,
  onPlayAll,
}: QuickPicksProps) {
  return (
    <section>
      <div className="section-head">
        <h2 className="section-title">Quick picks</h2>
        <button type="button" className="ghost-btn" onClick={onPlayAll}>
          Play all
        </button>
      </div>

      <div className="quick-grid">
        {songs.map((song) => {
          const isCurrent = song.id === currentSongId;
          const isLiked = likedSongIds.includes(song.id);

          return (
            <article
              key={song.id}
              className={`song-card ${isCurrent ? "song-card--active" : ""}`}
              onClick={() => onSelectSong(song.id)}
            >
              <div
                className="song-card__cover"
                style={{ background: song.accent }}
              >
                {song.title.slice(0, 1).toUpperCase()}
              </div>

              <div className="song-card__body">
                <div className="song-card__top">
                  <div>
                    <h3 className="song-card__title">{song.title}</h3>
                    <p className="song-card__meta">
                      {song.artist} • {song.album}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={`song-card__like ${
                      isLiked ? "song-card__like--active" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(song.id);
                    }}
                  >
                    ♥
                  </button>
                </div>

                <div className="song-card__footer">
                  <span>{song.category}</span>
                  <span>{song.plays} plays</span>
                  <span>{song.duration}</span>
                </div>

                <div className="song-card__status">
                  {isCurrent && isPlaying ? "Playing now" : "Tap to play"}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}