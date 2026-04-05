type Props = {
  search: string;
  setSearch: (value: string) => void;
};

export default function TopBar({ search, setSearch }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand-inline">
        </div>
      </div>

      <div className="topbar-center">
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs, albums, artists, podcasts"
          />
        </div>
      </div>

      <div className="topbar-right">
        <button className="topbar-icon">◫</button>
        <div className="avatar">H</div>
      </div>
    </header>
  );
}