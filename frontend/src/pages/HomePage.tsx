import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import PlayerBar from "../components/layout/PlayerBar";

export default function HomePage() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <TopBar />

        <main style={{ flex: 1, padding: 20 }}>
          <h1>Contenido</h1>
        </main>

        <PlayerBar />
      </div>
    </div>
  );
}