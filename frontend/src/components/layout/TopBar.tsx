export default function TopBar() {
  return (
    <div style={{ padding: 20, borderBottom: "1px solid #222" }}>
      <input
        placeholder="Search..."
        style={{
          padding: 10,
          width: 300,
          background: "#111",
          border: "1px solid #333",
          color: "white",
        }}
      />
    </div>
  );
}