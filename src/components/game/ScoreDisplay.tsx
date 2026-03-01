'use client';

import type { PlayerState } from '@/types/game';

interface ScoreDisplayProps {
  players: PlayerState[];
  currentRound: number;
  totalRounds: number;
  animatingPlayerId?: string | null;
}

export function ScoreDisplay({ players, currentRound, totalRounds, animatingPlayerId }: ScoreDisplayProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="inline-block bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-1 rounded-full">
          {currentRound}/{totalRounds}
        </span>
        <div className="flex gap-3">
          {sorted.map((player) => (
            <div key={player.id} className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: player.color }}
              />
              <span className="text-xs font-semibold text-gray-600 hidden sm:inline">
                {player.name}
              </span>
              <span
                className={`text-lg font-black ${animatingPlayerId === player.id ? 'animate-score-pop' : ''}`}
                style={{ color: player.color }}
              >
                {player.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
