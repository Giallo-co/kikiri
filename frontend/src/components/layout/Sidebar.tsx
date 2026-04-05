export default function Sidebar() {
  const items = [
    { label: "Home", icon: "⌂", active: true },
    { label: "Explore", icon: "◌", active: false },
    { label: "Library", icon: "▣", active: false },
    { label: "Upgrade", icon: "✦", active: false },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">▶</div>
        <span>Music</span>
      </div>

      <nav className="nav-list">
        {items.map((item) => (
          <button key={item.label} className={`nav-item ${item.active ? "active" : ""}`}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-separator" />

      <button className="playlist-button">
        <span>＋</span>
        <span>New playlist</span>
      </button>

      <div className="playlist-list">
        <div className="playlist-item">
          <span className="playlist-title">Liked Music</span>
          <span className="playlist-subtitle">Auto playlist</span>
        </div>

        <div className="playlist-item">
          <span className="playlist-title">Musica</span>
          <span className="playlist-subtitle">&nbsp;</span>
        </div>

        <div className="playlist-item">
          <span className="playlist-title">Episodes for Later</span>
          <span className="playlist-subtitle">Auto playlist</span>
        </div>
      </div>
    </aside>
  );
}