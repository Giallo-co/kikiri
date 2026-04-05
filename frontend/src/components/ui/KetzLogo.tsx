type Props = {
  width?: number;
};

export default function KetzLogo({ width = 120 }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg
        viewBox="0 0 240 80"
        width={width}
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.1))" }}
      >
        <defs>
          <linearGradient id="quetzalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1B5E20" />
            <stop offset="100%" stopColor="#26A69A" />
          </linearGradient>
        </defs>

        {/* K */}
        <path d="M20 15 V65 M20 40 L45 15 M25 35 L45 65"
          stroke="#26A69A" strokeWidth="8" strokeLinecap="round" fill="none"
        />

        {/* E */}
        <path d="M65 15 H90 M65 40 H85 M65 65 H90 M65 15 V65"
          stroke="#26A69A" strokeWidth="8" strokeLinecap="round" fill="none"
        />
        <circle cx="80" cy="40" r="4" fill="#EF5350" />

        {/* T */}
        <path d="M105 15 H135 M120 15 V65"
          stroke="#26A69A" strokeWidth="8" strokeLinecap="round" fill="none"
        />

        {/* Z */}
        <path d="M150 15 H185 L150 65 H185 C210 65, 220 45, 200 35"
          stroke="url(#quetzalGradient)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        />

        <circle cx="185" cy="15" r="4" fill="#FFA726" />
      </svg>
    </div>
  );
}