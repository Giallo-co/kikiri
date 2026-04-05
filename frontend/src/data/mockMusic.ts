export type Song = {
  id: number;
  title: string;
  artist: string;
  album: string;
  category: string;
  plays: string;
  duration: string;
  liked: boolean;
};

export type PromoCard = {
  title: string;
  subtitle: string;
  tone: "blue" | "purple" | "light";
  image: string;
};

export const categories = [
  "Relax",
  "Sleep",
  "Romance",
  "Sad",
  "Energize",
  "Party",
  "Feel good",
  "Workout",
  "Commute",
  "Focus",
];

export const promoCards: PromoCard[] = [
  {
    title: "Try the perfect playlist, made just for you",
    subtitle: "My Mix 01",
    tone: "blue",
    image:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Scan to download the music app",
    subtitle: "YouTube Music",
    tone: "purple",
    image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
  },
];

export const songs: Song[] = [
  {
    id: 1,
    title: "Novia",
    artist: "Jake Daniels",
    album: "Novia",
    category: "Relax",
    plays: "4.8M plays",
    duration: "2:11",
    liked: false,
  },
  {
    id: 2,
    title: "LoFi Deep Work Vibes",
    artist: "LO-FI BEATS",
    album: "Study LoFi",
    category: "Focus",
    plays: "1.3M plays",
    duration: "3:28",
    liked: false,
  },
  {
    id: 3,
    title: "BIG WIN!",
    artist: "Coolguy_Diet",
    album: "BIG WIN!",
    category: "Energize",
    plays: "820K plays",
    duration: "2:04",
    liked: true,
  },
  {
    id: 4,
    title: "Perfect Tokyo",
    artist: "LoFi Tokyo",
    album: "Perfect Tokyo",
    category: "Commute",
    plays: "498K plays",
    duration: "2:44",
    liked: false,
  },
  {
    id: 5,
    title: "Lofi Chill",
    artist: "Sad Music",
    album: "Cozy Lofi Hip-Hop",
    category: "Relax",
    plays: "5.6M plays",
    duration: "3:05",
    liked: false,
  },
  {
    id: 6,
    title: "どうして、わたし...",
    artist: "susumu.",
    album: "どうして、わたし...",
    category: "Sad",
    plays: "2.2M plays",
    duration: "3:41",
    liked: false,
  },
  {
    id: 7,
    title: "Set Fire to the Rain",
    artist: "Adele",
    album: "21",
    category: "Sad",
    plays: "595M plays",
    duration: "4:02",
    liked: false,
  },
  {
    id: 8,
    title: "Despacito",
    artist: "Luis Fonsi & Daddy Yankee",
    album: "Despacito",
    category: "Party",
    plays: "2.4B plays",
    duration: "3:48",
    liked: true,
  },
];