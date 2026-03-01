export type GameStatus = 'lobby' | 'playing' | 'paused' | 'finished';
export type GameMode = 'same_screen' | 'online';
export type TurnStyle = 'turns' | 'race';

export interface PlayerState {
  id: string;
  name: string;
  score: number;
  color: string;
}

export interface FaceData {
  id: string;
  label: string;
  imageUrl: string;
}

export interface CardDisplay {
  symbols: number[];
  faces: {
    faceIndex: number;
    x: number;
    y: number;
    size: number;
    rotation: number;
  }[];
}

export interface RoundState {
  roundNumber: number;
  card1: CardDisplay;
  card2: CardDisplay;
  matchingFaceIndex: number;
  startedAt: number;
}

export interface GameState {
  gameId: string;
  deckId: string;
  faces: FaceData[];
  cards: number[][];
  players: PlayerState[];
  currentRound: number;
  totalRounds: number;
  round: RoundState | null;
  status: GameStatus;
  mode: GameMode;
  turnStyle: TurnStyle;
  timerSeconds: number | null;
  drunkMode: boolean;
  usedCardPairs: [number, number][];
}

export interface GuessResult {
  playerId: string;
  playerName: string;
  correct: boolean;
  faceIndex: number;
  timeMs: number;
  scores: Record<string, number>;
}
