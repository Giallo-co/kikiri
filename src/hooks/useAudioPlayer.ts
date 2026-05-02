import { useRef, useState, useEffect, useCallback } from "react";
import type { Music } from "../types/music";

export function useAudioPlayer(track: Music | null, autoPlay = false, onEndedCallback?: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const volumeRef = useRef(1);

  useEffect(() => {
    if (!track) return;
    const audio = new Audio(track.music_url);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    audio.volume = volumeRef.current;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => {
      setDuration(audio.duration);
      if (autoPlay) {
        audio.play().then(() => setIsPlaying(true)).catch(() => {})
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      onEndedCallback?.();
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);

    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [track?.music_url, autoPlay, onEndedCallback]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const changeVolume = useCallback((val: number) => {
    const audio = audioRef.current;
    const clamped = Math.min(1, Math.max(0, val));
    setVolume(clamped);
    volumeRef.current = clamped;
    setIsMuted(clamped === 0);
    if (audio) audio.volume = clamped;
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !isMuted;
    setIsMuted(next);
    audio.volume = next ? 0 : volumeRef.current;
  }, [isMuted]);

  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  return { isPlaying, currentTime, duration, volume, isMuted, togglePlay, seek, changeVolume, toggleMute, restart };
}
