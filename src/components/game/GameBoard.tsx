'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState } from '@/types/game';
import { processGuess, nextRound } from '@/engine/game-logic';
import { GameCard } from './GameCard';
import { ScoreDisplay } from './ScoreDisplay';
import { Timer } from './Timer';
import { useTimer } from '@/hooks/useTimer';
import { useSound } from '@/hooks/useSound';

interface GameBoardProps {
  initialState: GameState;
  onGameEnd: (state: GameState) => void;
}

export function GameBoard({ initialState, onGameEnd }: GameBoardProps) {
  const [state, setState] = useState(initialState);
  const [activePlayer, setActivePlayer] = useState(0);
  const [highlightFace, setHighlightFace] = useState<number | null>(null);
  const [highlightColor, setHighlightColor] = useState<'green' | 'red' | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [claimingPlayer, setClaimingPlayer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [animatingScorePlayer, setAnimatingScorePlayer] = useState<string | null>(null);
  const [roundKey, setRoundKey] = useState(0);

  const sound = useSound();
  const prevSecondsRef = useRef<number | null>(null);

  const handleTimerExpire = useCallback(() => {
    setState((prev) => {
      const advanced = nextRound(prev);
      return advanced;
    });
  }, []);

  const timer = useTimer(state.timerSeconds, handleTimerExpire);

  // Reset timer on new round
  useEffect(() => {
    if (state.round) {
      timer.reset(state.timerSeconds);
      setRoundKey((k) => k + 1);
      sound.play('round-start');
    }
  }, [state.round?.roundNumber]);

  // Tick sound for last 3 seconds
  useEffect(() => {
    if (timer.secondsLeft !== null && timer.secondsLeft <= 3 && timer.secondsLeft > 0) {
      if (prevSecondsRef.current !== timer.secondsLeft) {
        sound.play('tick');
      }
    }
    prevSecondsRef.current = timer.secondsLeft;
  }, [timer.secondsLeft, sound]);

  useEffect(() => {
    if (state.status === 'finished') {
      sound.play('game-over');
      onGameEnd(state);
    }
  }, [state.status, state, onGameEnd, sound]);

  const handleClaim = useCallback((playerId: string) => {
    setClaimingPlayer(playerId);
  }, []);

  const handleFaceTap = useCallback(
    (faceIndex: number) => {
      if (disabled || !state.round) return;

      const playerId = claimingPlayer || state.players[activePlayer].id;
      const playerName = state.players.find((p) => p.id === playerId)?.name || '';

      setDisabled(true);
      setHighlightFace(faceIndex);

      const { correct, newState } = processGuess(state, playerId, faceIndex);

      if (correct) {
        sound.play('correct');
        setHighlightColor('green');
        setFeedback(`${playerName} +1!`);
        setAnimatingScorePlayer(playerId);
        setTimeout(() => {
          setState(newState);
          setHighlightFace(null);
          setHighlightColor(null);
          setDisabled(false);
          setClaimingPlayer(null);
          setFeedback(null);
          setAnimatingScorePlayer(null);
          if (!claimingPlayer) {
            setActivePlayer((prev) => (prev + 1) % state.players.length);
          }
        }, 800);
      } else {
        sound.play('wrong');
        setHighlightColor('red');
        setFeedback(`${playerName} -1`);
        setAnimatingScorePlayer(playerId);
        setTimeout(() => {
          setState(newState);
          setHighlightFace(null);
          setHighlightColor(null);
          setDisabled(false);
          setClaimingPlayer(null);
          setFeedback(null);
          setAnimatingScorePlayer(null);
        }, 500);
      }
    },
    [state, disabled, activePlayer, claimingPlayer, sound]
  );

  if (!state.round) return null;

  const claimingPlayerData = claimingPlayer
    ? state.players.find((p) => p.id === claimingPlayer)
    : null;

  return (
    <div className="space-y-3 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ScoreDisplay
            players={state.players}
            currentRound={state.currentRound}
            totalRounds={state.totalRounds}
            animatingPlayerId={animatingScorePlayer}
          />
        </div>
        <Timer secondsLeft={timer.secondsLeft} totalSeconds={state.timerSeconds} />
        <button
          onClick={sound.toggleMute}
          className="text-gray-400 hover:text-gray-600 text-xl p-1"
          title={sound.muted ? 'Activar sonido' : 'Silenciar'}
        >
          {sound.muted ? '🔇' : '🔊'}
        </button>
      </div>

      {feedback && (
        <div
          className={`text-center py-2 font-bold text-lg rounded-full animate-feedback-in ${
            highlightColor === 'green' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {feedback}
        </div>
      )}

      {state.mode === 'same_screen' && !claimingPlayer && !feedback && (
        <div className="flex gap-2">
          {state.players.map((player) => (
            <button
              key={player.id}
              onClick={() => handleClaim(player.id)}
              className="flex-1 py-3 text-white text-sm font-bold rounded-lg transition-colors"
              style={{ backgroundColor: player.color }}
            >
              {player.name}
            </button>
          ))}
        </div>
      )}

      {claimingPlayerData && !feedback && (
        <div
          className="text-center py-2.5 rounded-lg text-white font-bold text-sm"
          style={{ backgroundColor: claimingPlayerData.color }}
        >
          {claimingPlayerData.name} &mdash; Tocá la cara repetida!
        </div>
      )}

      <div key={roundKey} className="grid grid-cols-2 gap-3">
        <div className="animate-card-enter" style={{ animationDelay: '0s' }}>
          <GameCard
            card={state.round.card1}
            faces={state.faces}
            onFaceTap={handleFaceTap}
            disabled={disabled || (state.mode === 'same_screen' && !claimingPlayer)}
            highlightFace={highlightFace}
            highlightColor={highlightColor}
            drunkMode={state.drunkMode}
          />
        </div>
        <div className="animate-card-enter" style={{ animationDelay: '0.1s' }}>
          <GameCard
            card={state.round.card2}
            faces={state.faces}
            onFaceTap={handleFaceTap}
            disabled={disabled || (state.mode === 'same_screen' && !claimingPlayer)}
            highlightFace={highlightFace}
            highlightColor={highlightColor}
            drunkMode={state.drunkMode}
          />
        </div>
      </div>
    </div>
  );
}
