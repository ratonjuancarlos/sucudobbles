'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { QRCodeDisplay } from '@/components/game/QRCode';
import { GameCard } from '@/components/game/GameCard';
import { ScoreDisplay } from '@/components/game/ScoreDisplay';
import { Timer } from '@/components/game/Timer';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import { useSound } from '@/hooks/useSound';
import type { GameState } from '@/types/game';
import type { RoomStateData } from '@/types/socket-events';

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.roomCode as string) || '';
  const { connected, emit, on } = useSocket();

  const [roomState, setRoomState] = useState<RoomStateData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const sound = useSound();

  // Handle "new" room creation
  useEffect(() => {
    if (roomCode !== 'new' || !connected || creating) return;

    const configStr = sessionStorage.getItem('onlineConfig');
    if (!configStr) {
      router.push('/game/setup');
      return;
    }

    setCreating(true);
    const config = JSON.parse(configStr);
    // Store host name for rejoin on reconnect
    sessionStorage.setItem('playerName', config.hostName);
    console.log('[lobby] Emitting create-room as', config.hostName);
    emit('create-room', config, (response) => {
      console.log('[lobby] Room created:', response.roomCode);
      router.replace(`/game/lobby/${response.roomCode}`);
    });
  }, [roomCode, connected, emit, router, creating]);

  // Rejoin room on mount / reconnect — re-associates this socket with the room
  useEffect(() => {
    if (roomCode === 'new' || !connected) return;

    const playerName = sessionStorage.getItem('playerName') || '';
    console.log('[lobby] Rejoin effect triggered. roomCode:', roomCode, 'connected:', connected, 'playerName:', playerName);
    if (!playerName) {
      console.log('[lobby] No playerName in sessionStorage, skipping rejoin');
      return;
    }

    emit('rejoin-room', { roomCode, playerName }, (response) => {
      console.log('[lobby] Rejoin response:', response);
      if (!response.success) {
        console.error('[lobby] rejoin failed:', response.error);
      }
    });
  }, [roomCode, connected, emit]);

  // Listen for events
  useEffect(() => {
    if (roomCode === 'new' || !connected) return;

    const unsubs = [
      on('room-state', (data) => setRoomState(data)),
      on('game-started', (data) => {
        setGameState(data.gameState);
        sound.play('round-start');
      }),
      on('guess-result', (data) => {
        sound.play(data.correct ? 'correct' : 'wrong');
        setGameState((prev) => {
          if (!prev) return prev;
          const newPlayers = prev.players.map((p) => ({
            ...p,
            score: data.scores[p.id] ?? p.score,
          }));
          return { ...prev, players: newPlayers };
        });
      }),
      on('round-advanced', (data) => {
        sound.play('round-start');
        setGameState((prev) => {
          if (!prev) return prev;
          const newPlayers = prev.players.map((p) => ({
            ...p,
            score: data.scores[p.id] ?? p.score,
          }));
          return {
            ...prev,
            round: data.round,
            currentRound: data.currentRound,
            players: newPlayers,
          };
        });
      }),
      on('game-over', (data) => {
        sound.play('game-over');
        setGameState((prev) => {
          if (!prev) return prev;
          return { ...prev, status: 'finished', players: data.players };
        });
        setFinished(true);
      }),
      on('error', (data) => setError(data.message)),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [roomCode, connected, on, sound]);

  const handleGuess = useCallback(
    (faceIndex: number, roundNumber: number) => {
      emit('guess', { roomCode, faceIndex, roundNumber });
    },
    [emit, roomCode]
  );

  if (roomCode === 'new') {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Creando sala...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-4 max-w-sm">
          <p className="text-red-500 font-semibold">{error}</p>
          <button onClick={() => router.push('/game/setup')} className="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg">
            Volver
          </button>
        </div>
      </div>
    );
  }

  // Game over
  if (gameState && finished) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <GameOverScreen players={gameState.players} deckId={gameState.deckId} />
        </div>
      </div>
    );
  }

  // Playing state
  if (gameState && gameState.round) {
    return (
      <div className="h-dvh bg-gray-50 p-3 flex flex-col">
        <OnlineGameBoard gameState={gameState} onGuess={handleGuess} sound={sound} on={on} />
      </div>
    );
  }

  // Lobby
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/game/join?room=${roomCode}`
    : '';

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button onClick={() => router.push('/game/setup')} className="text-indigo-600 font-semibold text-sm">
            &larr; Volver
          </button>
          <h1 className="text-2xl font-black text-gray-900">Sala Online</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center space-y-4">
          <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide">Código de sala</p>
          <p className="text-4xl font-black text-indigo-600 tracking-[0.3em]">{roomCode}</p>
          {joinUrl && <QRCodeDisplay url={joinUrl} />}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-3">
          <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">
            Jugadores ({roomState?.players.length || 0}/6)
          </h3>
          {roomState?.players.map((player) => (
            <div key={player.id} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: player.color }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-gray-900">{player.name}</span>
              {player.id === roomState?.hostId && (
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">Host</span>
              )}
            </div>
          ))}
          {(!roomState || roomState.players.length < 2) && (
            <p className="text-sm text-gray-400">Esperando jugadores...</p>
          )}
        </div>

        {roomState && roomState.players.length >= 2 && (
          <button
            onClick={() => emit('start-game', { roomCode })}
            disabled={!connected}
            className="w-full bg-green-600 text-white font-bold text-lg py-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Empezar partida!
          </button>
        )}

        {!connected && (
          <p className="text-sm text-amber-500 text-center font-semibold">Reconectando...</p>
        )}
      </main>
    </div>
  );
}

// Online game board with server-driven state
function OnlineGameBoard({
  gameState,
  onGuess,
  sound,
  on,
}: {
  gameState: GameState;
  onGuess: (faceIndex: number, roundNumber: number) => void;
  sound: ReturnType<typeof useSound>;
  on: ReturnType<typeof useSocket>['on'];
}) {
  const [highlightFace, setHighlightFace] = useState<number | null>(null);
  const [highlightColor, setHighlightColor] = useState<'green' | 'red' | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(gameState.timerSeconds);

  useEffect(() => {
    const unsubs = [
      on('guess-result', (data) => {
        setHighlightFace(data.faceIndex);
        setHighlightColor(data.correct ? 'green' : 'red');
        setFeedback(`${data.playerName} ${data.correct ? '+1!' : '-1'}`);
        setTimeout(() => {
          setHighlightFace(null);
          setHighlightColor(null);
          setFeedback(null);
          setDisabled(false);
        }, data.correct ? 800 : 500);
      }),
      on('timer-tick', (data) => setTimerSeconds(data.secondsLeft)),
      on('round-advanced', () => setTimerSeconds(gameState.timerSeconds)),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on, gameState.timerSeconds]);

  function handleFaceTap(faceIndex: number) {
    if (disabled || !gameState.round) return;
    setDisabled(true);
    onGuess(faceIndex, gameState.round.roundNumber);
  }

  if (!gameState.round) return null;

  return (
    <div className="flex flex-col gap-2 w-full max-w-2xl mx-auto h-full">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ScoreDisplay
            players={gameState.players}
            currentRound={gameState.currentRound}
            totalRounds={gameState.totalRounds}
          />
        </div>
        <Timer secondsLeft={timerSeconds} totalSeconds={gameState.timerSeconds} />
        <button onClick={sound.toggleMute} className="text-gray-400 hover:text-gray-600 text-xl p-1">
          {sound.muted ? '🔇' : '🔊'}
        </button>
      </div>

      {feedback && (
        <div className={`text-center py-2 font-bold text-lg rounded-full animate-feedback-in ${
          highlightColor === 'green' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {feedback}
        </div>
      )}

      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="animate-card-enter flex-1 min-h-0">
          <GameCard
            card={gameState.round.card1}
            faces={gameState.faces}
            onFaceTap={handleFaceTap}
            disabled={disabled}
            highlightFace={highlightFace}
            highlightColor={highlightColor}
            drunkMode={gameState.drunkMode}
          />
        </div>
        <div className="animate-card-enter flex-1 min-h-0" style={{ animationDelay: '0.1s' }}>
          <GameCard
            card={gameState.round.card2}
            faces={gameState.faces}
            onFaceTap={handleFaceTap}
            disabled={disabled}
            highlightFace={highlightFace}
            highlightColor={highlightColor}
            drunkMode={gameState.drunkMode}
          />
        </div>
      </div>
    </div>
  );
}
