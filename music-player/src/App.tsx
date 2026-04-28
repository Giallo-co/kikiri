import PlayerBar from "./components/PlayerBar/PlayerBar";
import type { Music } from "./types/music";

const DEMO_TRACK: Music = {
  music_id: "1",
  music_name: "Key",
  music_description: '"key" is the song that sort of introduces you to the album',
  music_author: "C418",
  music_cover_url: "http://localhost:9000/music-cover/volume-alpha.jpg",
  music_url: "http://localhost:9000/music/volume-alpha/key.mp3",
  music_album: "Volume Alpha",
  likes: 0,
  views: 0,
  shares: 0,
  comments: 0,
};

export default function App() {
  return (
    <div style={{ minHeight: "100vh", padding: "2rem", color: "#fff" }}>
      <p style={{ opacity: 0.3, fontSize: "0.85rem" }}>Page content area</p>
      <PlayerBar track={DEMO_TRACK} />
    </div>
  );
}
