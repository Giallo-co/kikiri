export default function PlayerBar() {
  return (
    <div
      style={{
        padding: 20,
        borderTop: "1px solid #222",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <span>No song selected</span>
      <div>
        <button>⏮</button>
        <button>▶</button>
        <button>⏭</button>
      </div>
    </div>
  );
}