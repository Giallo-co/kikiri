import { useEffect, useMemo, useState } from "react";
import { songs } from "../data/mockMusic";

export function useMusicPrototype() {
  const [activeCategory, setActiveCategory] = useState("Relax");
  const [search, setSearch] = useState("");
  const [currentSongId, setCurrentSongId] = useState(songs[0]?.id ?? "");
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedSongIds, setLikedSongIds] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState("Home");
  const [progress, setProgress] = useState(18);

  const filteredSongs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return songs.filter((song) => {
      const matchesCategory = song.category === activeCategory;
      const matchesSearch =
        !query ||
        `${song.title} ${song.artist} ${song.album} ${song.category}`
          .toLowerCase()
          .includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  const visibleSongs = filteredSongs.length > 0 ? filteredSongs : songs;

  const currentSong =
    songs.find((song) => song.id === currentSongId) ?? songs[0] ?? null;

  const selectSong = (songId: string) => {
    setCurrentSongId(songId);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying((value) => !value);
  };

  const playAll = () => {
    const firstSong = visibleSongs[0];
    if (!firstSong) return;
    setCurrentSongId(firstSong.id);
    setIsPlaying(true);
  };

  const nextSong = () => {
    if (visibleSongs.length === 0) return;

    const index = visibleSongs.findIndex((song) => song.id === currentSongId);
    const nextIndex = index >= 0 ? (index + 1) % visibleSongs.length : 0;
    setCurrentSongId(visibleSongs[nextIndex].id);
    setIsPlaying(true);
  };

  const prevSong = () => {
    if (visibleSongs.length === 0) return;

    const index = visibleSongs.findIndex((song) => song.id === currentSongId);
    const prevIndex =
      index > 0 ? index - 1 : visibleSongs.length - 1;

    setCurrentSongId(visibleSongs[prevIndex].id);
    setIsPlaying(true);
  };

  const toggleLike = (songId: string) => {
    setLikedSongIds((current) =>
      current.includes(songId)
        ? current.filter((id) => id !== songId)
        : [...current, songId]
    );
  };

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 100 ? 0 : value + 1));
    }, 350);

    return () => window.clearInterval(timer);
  }, [isPlaying, currentSongId]);

  useEffect(() => {
    setProgress(18);
  }, [currentSongId]);

  return {
    categories: ["Relax", "Sleep", "Romance", "Sad", "Energize", "Party", "Feel good", "Workout", "Commute", "Focus"],
    activeCategory,
    setActiveCategory,
    search,
    setSearch,
    activeSection,
    setActiveSection,
    currentSong,
    currentSongId,
    isPlaying,
    progress,
    likedSongIds,
    filteredSongs,
    visibleSongs,
    selectSong,
    togglePlay,
    nextSong,
    prevSong,
    toggleLike,
    playAll,
  };
}