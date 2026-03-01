'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerReturn {
  secondsLeft: number | null;
  reset: (seconds: number | null) => void;
}

export function useTimer(
  initialSeconds: number | null,
  onExpire: () => void
): UseTimerReturn {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(initialSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;

    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(id);
          setTimeout(() => onExpireRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [secondsLeft === null ? null : secondsLeft > 0]); // re-run only on null/non-null or zero transitions

  const reset = useCallback((seconds: number | null) => {
    setSecondsLeft(seconds);
  }, []);

  return { secondsLeft, reset };
}
