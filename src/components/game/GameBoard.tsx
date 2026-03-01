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
  onQuit?: () => void;
}

export function GameBoard({ initialState, onGameEnd, onQuit }: GameBoardProps) {
  const [state, setState] = useState(initialState);
  const [activePlayer, setActivePlayer] = useState(0);
  const [highlightFace, setHighlightFace] = useState<number | null>(null);
  const [highlightColor, setHighlightColor] = useState<'green' | 'red' | 'blue' | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [selectedFace, setSelectedFace] = useState<number | null>(null); // race mode: face tapped before claiming
  const [feedback, setFeedback] = useState<string | null>(null);
  const [animatingScorePlayer, setAnimatingScorePlayer] = useState<string | null>(null);
  const [roundKey, setRoundKey] = useState(0);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const isRaceMode = state.mode === 'same_screen' && state.turnStyle === 'race';
  const isTurnsMode = state.mode === 'same_screen' && state.turnStyle === 'turns';

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
      setSelectedFace(null);
      setHighlightFace(null);
      setHighlightColor(null);
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

  // Race mode: player claims after tapping a face
  const handleRaceClaim = useCallback((playerId: string) => {
    if (selectedFace === null || disabled || !state.round) return;

    const playerName = state.players.find((p) => p.id === playerId)?.name || '';
    setDisabled(true);

    const { correct, newState } = processGuess(state, playerId, selectedFace);

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
        setSelectedFace(null);
        setFeedback(null);
        setAnimatingScorePlayer(null);
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
        setSelectedFace(null);
        setFeedback(null);
        setAnimatingScorePlayer(null);
      }, 500);
    }
  }, [state, selectedFace, disabled, sound]);

  const handleFaceTap = useCallback(
    (faceIndex: number) => {
      if (disabled || !state.round) return;

      // Race mode: just select the face, wait for player claim
      if (isRaceMode) {
        setSelectedFace(faceIndex);
        setHighlightFace(faceIndex);
        setHighlightColor(null); // neutral highlight
        return;
      }

      // Turns mode: process immediately for the active player
      const playerId = state.players[activePlayer].id;
      const playerName = state.players[activePlayer].name;

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
          setFeedback(null);
          setAnimatingScorePlayer(null);
          setActivePlayer((prev) => (prev + 1) % state.players.length);
        }, 800);
      } else {
        sound.play('wrong');
        setHighlightColor('red');
        setFeedback(`${playerName} pierde turno`);
        setTimeout(() => {
          setState(newState);
          setHighlightFace(null);
          setHighlightColor(null);
          setDisabled(false);
          setFeedback(null);
          setActivePlayer((prev) => (prev + 1) % state.players.length);
        }, 500);
      }
    },
    [state, disabled, activePlayer, isRaceMode, sound]
  );

  const handleQuit = useCallback(() => {
    if (onQuit) {
      onQuit();
    } else {
      // Force finish with current scores
      onGameEnd({ ...state, status: 'finished' });
    }
  }, [state, onQuit, onGameEnd]);

  if (!state.round) return null;

  return (
    <div className="flex flex-col gap-2 w-full max-w-lg mx-auto h-full">
      {/* Header: score + timer + controls */}
      <div className="flex items-center gap-2">
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
          className="text-gray-400 hover:text-gray-600 text-lg p-1"
          title={sound.muted ? 'Activar sonido' : 'Silenciar'}
        >
          {sound.muted ? '🔇' : '🔊'}
        </button>
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="text-gray-400 hover:text-red-500 text-sm font-bold p-1"
          title="Salir"
        >
          ✕
        </button>
      </div>

      {/* Quit confirmation */}
      {showQuitConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-red-700 text-sm font-semibold">Abandonar partida?</span>
          <div className="flex gap-2">
            <button
              onClick={handleQuit}
              className="bg-red-500 text-white text-sm font-bold px-4 py-1.5 rounded-lg"
            >
              Salir
            </button>
            <button
              onClick={() => setShowQuitConfirm(false)}
              className="bg-white border border-gray-300 text-gray-600 text-sm font-bold px-4 py-1.5 rounded-lg"
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          className={`text-center py-2 font-bold text-lg rounded-full animate-feedback-in ${
            highlightColor === 'green' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {feedback}
        </div>
      )}

      {/* Turns mode: active player indicator */}
      {isTurnsMode && !feedback && (
        <div
          className="text-center py-2.5 rounded-lg text-white font-bold text-sm"
          style={{ backgroundColor: state.players[activePlayer].color }}
        >
          Turno de {state.players[activePlayer].name}
        </div>
      )}

      {/* Race mode: player claim buttons (shown after face is tapped) */}
      {isRaceMode && selectedFace !== null && !disabled && !feedback && (
        <div className="space-y-1">
          <p className="text-center text-xs text-gray-500 font-semibold">Quién encontró la cara?</p>
          <div className="flex gap-2">
            {state.players.map((player) => (
              <button
                key={player.id}
                onClick={() => handleRaceClaim(player.id)}
                className="flex-1 py-3 text-white text-sm font-bold rounded-lg transition-colors active:scale-95"
                style={{ backgroundColor: player.color }}
              >
                {player.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Race mode: instruction when no face selected */}
      {isRaceMode && selectedFace === null && !feedback && (
        <div className="text-center py-2 text-gray-400 text-sm font-semibold">
          Tocá la cara que se repite!
        </div>
      )}

      {/* Cards - stacked vertically, landscape */}
      <div key={roundKey} className="flex flex-col gap-3 flex-1">
        <div className="animate-card-enter flex-1" style={{ animationDelay: '0s' }}>
          <GameCard
            card={state.round.card1}
            faces={state.faces}
            onFaceTap={handleFaceTap}
            disabled={disabled || (isRaceMode && selectedFace !== null)}
            highlightFace={highlightFace}
            highlightColor={highlightColor}
            drunkMode={state.drunkMode}
          />
        </div>
        <div className="animate-card-enter flex-1" style={{ animationDelay: '0.1s' }}>
          <GameCard
            card={state.round.card2}
            faces={state.faces}
            onFaceTap={handleFaceTap}
            disabled={disabled || (isRaceMode && selectedFace !== null)}
            highlightFace={highlightFace}
            highlightColor={highlightColor}
            drunkMode={state.drunkMode}
          />
        </div>
      </div>
    </div>
  );
}
