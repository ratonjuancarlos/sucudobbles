'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { PlayerState } from '@/types/game';
import Link from 'next/link';

interface GameOverScreenProps {
  players: PlayerState[];
  deckId: string;
  totalRounds?: number;
  mode?: 'same_screen' | 'online';
}

const MEDALS = ['🥇', '🥈', '🥉'];
const CONFETTI_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export function GameOverScreen({ players, deckId, totalRounds = 10, mode = 'same_screen' }: GameOverScreenProps) {
  const savedRef = useRef(false);

  useEffect(() => {
    if (savedRef.current || mode === 'online') return;
    savedRef.current = true;

    fetch('/api/game/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deckId,
        players: players.map((p) => ({ name: p.name, score: p.score, color: p.color })),
        totalRounds,
        mode,
      }),
    }).catch(() => {});
  }, [deckId, players, totalRounds, mode]);
  const sorted = [...players].sort((a, b) => b.score - a.score);

  const confettiPieces = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 6,
    })),
  []);

  return (
    <div className="text-center space-y-6 relative overflow-hidden">
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confettiPieces.map((piece, i) => (
          <div
            key={i}
            className="absolute rounded-sm"
            style={{
              left: `${piece.left}%`,
              top: '-10px',
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              backgroundColor: piece.color,
              animation: `confetti-fall ${piece.duration}s ease-in ${piece.delay}s forwards`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <h2 className="text-3xl font-black text-gray-900">Fin!</h2>
        <p className="text-gray-500 font-semibold mt-1">
          Ganó <span style={{ color: sorted[0].color }}>{sorted[0].name}</span>!
        </p>
      </div>

      <div className="space-y-3 relative z-10">
        {sorted.map((player, i) => (
          <div
            key={player.id}
            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between ${
              i === 0 ? 'bg-yellow-50' : ''
            }`}
            style={{
              animation: `card-enter 0.4s ease-out ${i * 0.15}s both`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{MEDALS[i] || `#${i + 1}`}</span>
              <div
                className="w-6 h-6 rounded-full border border-gray-300"
                style={{ backgroundColor: player.color }}
              />
              <span className="font-bold text-gray-900">{player.name}</span>
            </div>
            <span className="text-3xl font-black" style={{ color: player.color }}>
              {player.score}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 relative z-10">
        <Link
          href={`/game/setup?deckId=${deckId}`}
          className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors text-center"
        >
          Revancha!
        </Link>
        <Link
          href="/dashboard"
          className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50 transition-colors text-center"
        >
          Inicio
        </Link>
      </div>
    </div>
  );
}
