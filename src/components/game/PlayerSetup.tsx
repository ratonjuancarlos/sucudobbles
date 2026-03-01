'use client';

import { useState } from 'react';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

interface PlayerSetupProps {
  onStart: (players: { name: string; color: string }[]) => void;
}

export function PlayerSetup({ onStart }: PlayerSetupProps) {
  const [players, setPlayers] = useState([
    { name: 'Jugador 1', color: COLORS[0] },
    { name: 'Jugador 2', color: COLORS[1] },
  ]);

  function addPlayer() {
    if (players.length >= 6) return;
    setPlayers([
      ...players,
      { name: `Jugador ${players.length + 1}`, color: COLORS[players.length % COLORS.length] },
    ]);
  }

  function removePlayer(index: number) {
    if (players.length <= 2) return;
    setPlayers(players.filter((_, i) => i !== index));
  }

  function updateName(index: number, name: string) {
    setPlayers(players.map((p, i) => (i === index ? { ...p, name } : p)));
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Jugadores</h3>

      {players.map((player, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: player.color }}
          >
            {i + 1}
          </div>
          <input
            type="text"
            value={player.name}
            onChange={(e) => updateName(i, e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            maxLength={20}
          />
          {players.length > 2 && (
            <button
              onClick={() => removePlayer(i)}
              className="text-red-500 font-bold text-lg w-8 h-8 flex items-center justify-center"
            >
              &times;
            </button>
          )}
        </div>
      ))}

      {players.length < 6 && (
        <button
          onClick={addPlayer}
          className="w-full bg-indigo-50 text-indigo-600 font-semibold text-sm py-2.5 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          + Agregar jugador
        </button>
      )}

      <button
        onClick={() => onStart(players)}
        disabled={players.some((p) => !p.name.trim())}
        className="w-full bg-green-600 text-white font-bold text-lg py-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        A jugar!
      </button>
    </div>
  );
}
