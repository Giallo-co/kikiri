import type { Song } from "../../data/mockMusic";

type Props = {
  song: Song;
  selected?: boolean;
  onSelect: (song: Song) => void;
};

export default function SongRow({ song, selected, onSelect }: Props) {
  return (
    <div
      className="song-row"
      style={{
        borderColor: selected ? "rgba(139, 92, 246, 0.45)" : "transparent",
        background: selected ? "rgba(139, 92, 246, 0.12)" : undefined,
      }}
      onClick={() => onSelect(song)}
      role="button"
      tabIndex={0}
    >
      <div
        className="song-cover"
        style={{
          background:
            "linear-gradient(135deg, rgba(139,92,246,0.95), rgba(34,211,238,0.95))",
        }}
      >
        {song.title.slice(0, 2).toUpperCase()}
      </div>

      <div className="song-meta">
        <p className="song-title">{song.title}</p>
        <p className="song-subtitle">
          {song.artist} · {song.album}
        </p>
      </div>

      <div className="song-actions">
        <span className="muted">{song.duration}</span>
      </div>
    </div>
  );
}