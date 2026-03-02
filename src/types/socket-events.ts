import type { GameState, PlayerState, RoundState } from './game';

export interface RoomConfig {
  deckId: string;
  difficulty: number;
  totalRounds: number;
  timerSeconds: number | null;
  drunkMode: boolean;
}

export interface RoomStateData {
  roomCode: string;
  players: PlayerState[];
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  config: RoomConfig;
}

export interface ClientToServerEvents {
  'create-room': (
    data: RoomConfig & { hostName: string },
    callback: (response: { roomCode: string }) => void
  ) => void;

  'join-room': (
    data: { roomCode: string; playerName: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  'rejoin-room': (
    data: { roomCode: string; playerName: string },
    callback: (response: { success: boolean; error?: string }) => void
  ) => void;

  'start-game': (data: { roomCode: string }) => void;

  'guess': (data: { roomCode: string; faceIndex: number; roundNumber: number }) => void;

  'leave-room': (data: { roomCode: string }) => void;
}

export interface ServerToClientEvents {
  'room-state': (data: RoomStateData) => void;

  'player-joined': (data: { player: PlayerState }) => void;
  'player-left': (data: { playerId: string; playerName: string }) => void;

  'game-started': (data: { gameState: GameState }) => void;
  'round-started': (data: { round: RoundState; currentRound: number }) => void;

  'guess-result': (data: {
    playerId: string;
    playerName: string;
    correct: boolean;
    faceIndex: number;
    scores: Record<string, number>;
  }) => void;

  'round-advanced': (data: {
    round: RoundState | null;
    currentRound: number;
    scores: Record<string, number>;
  }) => void;

  'timer-tick': (data: { secondsLeft: number }) => void;
  'timer-expired': () => void;

  'game-over': (data: { players: PlayerState[]; winnerId: string }) => void;

  'error': (data: { message: string }) => void;
}
