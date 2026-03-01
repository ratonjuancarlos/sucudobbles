'use client';

import { useRef, useCallback, useState, useEffect } from 'react';

type SoundName = 'correct' | 'wrong' | 'tick' | 'round-start' | 'game-over';

const SOUND_FILES: Record<SoundName, string> = {
  'correct': '/sounds/correct.wav',
  'wrong': '/sounds/wrong.wav',
  'tick': '/sounds/tick.wav',
  'round-start': '/sounds/round-start.wav',
  'game-over': '/sounds/game-over.wav',
};

export function useSound() {
  const audioMap = useRef<Map<SoundName, HTMLAudioElement>>(new Map());
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sucudobble-muted');
    if (stored === 'true') setMuted(true);

    // Preload all sounds
    for (const [name, src] of Object.entries(SOUND_FILES)) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audioMap.current.set(name as SoundName, audio);
    }
  }, []);

  const play = useCallback((name: SoundName) => {
    if (muted) return;
    const audio = audioMap.current.get(name);
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // Browser may block autoplay
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem('sucudobble-muted', String(next));
      return next;
    });
  }, []);

  return { play, muted, toggleMute };
}
