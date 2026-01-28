import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim"; 
import "./App.css";

export default function App() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine); 
    }).then(() => {
      setInit(true);
    });
  }, []);

  return (
    <div className="container">
      {init && (
        <Particles
          id="tsparticles"
          options={{
            background: {
              color: "#000", 
            },
            fpsLimit: 120,
            particles: {
              number: {
                value: 150, 
                density: { enable: true },
              },
              color: { value: "#ffffff" }, 
              shape: { type: "circle" },
              opacity: {
                value: { min: 0.1, max: 1 }, 
                animation: {
                  enable: true,
                  speed: 1, 
                  sync: false,
                },
              },
              size: {
                value: { min: 1, max: 3 }, 
              },
              move: {
                enable: true,
                speed: 0.2, 
                direction: "none",
                random: true,
                straight: false,
                outModes: { default: "out" },
              },
            },
          }}
        />
      )}

      <div className="content">
        <h1 className="elegant-title">Hello, World</h1>
        <h1>(I was bored 😛) </h1>
      </div>
    </div>
  );
}