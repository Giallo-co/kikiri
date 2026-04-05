import { useMemo, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import PlayerBar from "../components/layout/PlayerBar";
import { categories, promoCards, songs, type Song } from "../data/mockMusic";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("Relax");
  const [currentSong, setCurrentSong] = useState<Song | null>(songs[0] ?? null);
  const [search, setSearch] = useState("");

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchCategory = song.category === activeCategory;
      const q = search.trim().toLowerCase();
      const matchSearch =
        q.length === 0 ||
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.album.toLowerCase().includes(q);

      return matchCategory && matchSearch;
    });
  }, [activeCategory, search]);

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-panel">
        <TopBar search={search} setSearch={setSearch} />

        <main className="content">
          <section className="hero">
            <div className="hero-left">
              <div className="hero-avatar">H</div>
              <div>
                <p className="hero-subtitle">Good afternoon</p>
                <h1 className="hero-title">Welcome Dave Davison </h1>
              </div>
            </div>

            <div className="hero-cards">
              {promoCards.map((card) => (
                <article key={card.title} className={`promo-card ${card.tone}`}>
                  <div className="promo-copy">
                    <p className="promo-text">{card.title}</p>
                    <span className="muted">{card.subtitle}</span>
                    <button className="round-btn">→</button>
                  </div>
                  <div
                    className="promo-image"
                    style={{ backgroundImage: `url(${card.image})` }}
                  />
                </article>
              ))}
            </div>
          </section>

          <div className="chip-row">
            {categories.map((category) => (
              <button
                key={category}
                className={`chip ${activeCategory === category ? "active" : ""}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="section-header">
            <h2 className="section-title">Quick picks</h2>
            <button className="pill-btn">Play all</button>
          </div>

          <div className="song-grid">
            {filteredSongs.map((song) => (
              <button
                key={song.id}
                className={`song-card ${currentSong?.id === song.id ? "selected" : ""}`}
                onClick={() => setCurrentSong(song)}
              >
                <div className="song-cover">
                  {song.title.slice(0, 2).toUpperCase()}
                </div>

                <div className="song-meta">
                  <p className="song-title">{song.title}</p>
                  <p className="song-subtitle">
                    {song.artist} · {song.plays}
                  </p>
                </div>

                <div className="song-actions">
                  <span>{song.duration}</span>
                </div>
              </button>
            ))}
          </div>
        </main>

        <PlayerBar currentSong={currentSong} />
      </div>
    </div>
  );
}