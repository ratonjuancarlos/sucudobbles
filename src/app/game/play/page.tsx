'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGameState, startGame } from '@/engine/game-logic';
import { GameBoard } from '@/components/game/GameBoard';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import type { GameState, FaceData } from '@/types/game';
import { nanoid } from 'nanoid';

export default function PlayPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const configStr = sessionStorage.getItem('gameConfig');
    if (!configStr) {
      router.push('/game/setup');
      return;
    }

    const config = JSON.parse(configStr);

    fetch(`/api/decks/${config.deckId}`)
      .then((res) => res.json())
      .then((deck) => {
        const faces: FaceData[] = deck.faces.map((f: { id: string; label: string; imageUrl: string }) => ({
          id: f.id,
          label: f.label,
          imageUrl: f.imageUrl,
        }));

        try {
          const state = createGameState(
            nanoid(8),
            config.deckId,
            faces,
            config.difficulty,
            config.players.map((p: { name: string }) => p.name),
            config.totalRounds,
            config.mode,
            config.timerSeconds ?? null,
            config.drunkMode ?? false
          );

          const started = startGame(state);
          setGameState(started);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Error al crear la partida');
        }

        setLoading(false);
      })
      .catch(() => {
        setError('Error al cargar el mazo');
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <p className="font-semibold text-gray-500">Preparando partida...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-4 max-w-sm">
          <p className="text-red-500 font-semibold">{error}</p>
          <button
            onClick={() => router.push('/game/setup')}
            className="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  if (finished) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <GameOverScreen
            players={gameState.players}
            deckId={gameState.deckId}
            totalRounds={gameState.totalRounds}
            mode={gameState.mode === 'same_screen' ? 'same_screen' : 'online'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-gray-50 p-3 flex flex-col">
      <GameBoard
        initialState={gameState}
        onGameEnd={(finalState) => {
          setGameState(finalState);
          setFinished(true);
        }}
        onQuit={() => router.push('/dashboard')}
      />
    </div>
  );
}
