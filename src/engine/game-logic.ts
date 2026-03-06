import type { GameState, CardDisplay, RoundState, PlayerState, FaceData, TurnStyle } from '@/types/game';
import { generateCards, findMatch, shuffleArray } from './projective-plane';
import { getDifficultyByOrder } from './difficulty';

const PLAYER_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export function createGameState(
  gameId: string,
  deckId: string,
  faces: FaceData[],
  difficultyOrder: number,
  playerNames: string[],
  totalRounds: number,
  mode: 'same_screen' | 'online',
  timerSeconds: number | null,
  drunkMode: boolean = false,
  turnStyle: TurnStyle = 'turns'
): GameState {
  const difficulty = getDifficultyByOrder(difficultyOrder);

  if (faces.length < difficulty.totalSymbols) {
    throw new Error(
      `Need ${difficulty.totalSymbols} faces for ${difficulty.label}, got ${faces.length}`
    );
  }

  const cards = generateCards(difficultyOrder);

  const players: PlayerState[] = playerNames.map((name, i) => ({
    id: `player-${i}`,
    name,
    score: 0,
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
  }));

  return {
    gameId,
    deckId,
    faces: faces.slice(0, difficulty.totalSymbols),
    cards: shuffleArray(cards),
    players,
    currentRound: 0,
    totalRounds: Math.min(totalRounds, Math.floor((cards.length * (cards.length - 1)) / 2)),
    round: null,
    status: 'lobby',
    mode,
    turnStyle,
    timerSeconds,
    drunkMode,
    usedCardPairs: [],
  };
}

export function startGame(state: GameState): GameState {
  const newState = { ...state, status: 'playing' as const, currentRound: 0 };
  return nextRound(newState);
}

export function nextRound(state: GameState): GameState {
  if (state.currentRound >= state.totalRounds) {
    return { ...state, status: 'finished', round: null };
  }

  const { card1Index, card2Index } = pickCardPair(state);
  const card1Symbols = state.cards[card1Index];
  const card2Symbols = state.cards[card2Index];
  const matchingFaceIndex = findMatch(card1Symbols, card2Symbols);

  const round: RoundState = {
    roundNumber: state.currentRound + 1,
    card1: buildCardDisplay(card1Symbols),
    card2: buildCardDisplay(card2Symbols),
    matchingFaceIndex,
    startedAt: Date.now(),
  };

  return {
    ...state,
    currentRound: state.currentRound + 1,
    round,
    usedCardPairs: [...state.usedCardPairs, [card1Index, card2Index]],
  };
}

function pickCardPair(state: GameState): { card1Index: number; card2Index: number } {
  const usedSet = new Set(state.usedCardPairs.map(([a, b]) => `${a}-${b}`));
  const totalCards = state.cards.length;

  for (let attempts = 0; attempts < 1000; attempts++) {
    const i = Math.floor(Math.random() * totalCards);
    const j = Math.floor(Math.random() * totalCards);
    if (i === j) continue;
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (!usedSet.has(key)) {
      return { card1Index: i, card2Index: j };
    }
  }

  // Fallback: use any pair
  return { card1Index: 0, card2Index: 1 };
}

function buildCardDisplay(symbols: number[]): CardDisplay {
  const shuffled = shuffleArray(symbols);
  const positions = generatePositions(shuffled.length);
  const faces = shuffled.map((faceIndex, i) => ({
    faceIndex,
    ...positions[i],
  }));
  return { symbols, faces };
}

function generatePositions(
  total: number
): { x: number; y: number; size: number; rotation: number }[] {
  // Random starting angle so the whole layout rotates differently each round
  const baseAngle = Math.random() * Math.PI * 2;

  if (total <= 4) {
    // Circular arrangement with random base angle — radius varies by count
    const radius = total <= 3 ? 28 : 30;
    const size = total <= 3 ? 22 : 18;
    const sizeJitter = total <= 3 ? 20 : 16;
    return Array.from({ length: total }, (_, i) => {
      const angle = baseAngle + (i / total) * Math.PI * 2;
      return {
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius,
        size: size + Math.random() * sizeJitter,
        rotation: Math.random() * 360,
      };
    });
  }

  // For 6+ faces: one in center, rest evenly around a circle
  return Array.from({ length: total }, (_, i) => {
    if (i === 0) {
      return {
        x: 50,
        y: 50,
        size: 16 + Math.random() * 14,
        rotation: Math.random() * 360,
      };
    }
    const angle = baseAngle + ((i - 1) / (total - 1)) * Math.PI * 2;
    const radius = 25 + Math.random() * 8;
    return {
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      size: 12 + Math.random() * 12,
      rotation: Math.random() * 360,
    };
  });
}

export function processGuess(
  state: GameState,
  playerId: string,
  faceIndex: number
): { correct: boolean; newState: GameState } {
  if (!state.round || state.status !== 'playing') {
    return { correct: false, newState: state };
  }

  const correct = faceIndex === state.round.matchingFaceIndex;

  const scoreChange = correct ? 1 : 0;
  const newPlayers = state.players.map((p) => {
    if (p.id !== playerId) return p;
    return { ...p, score: p.score + scoreChange };
  });

  let newState: GameState = { ...state, players: newPlayers };

  // In turns mode, always advance to next round (wrong = lose turn + new cards)
  // In race mode, only advance on correct (others can still try same cards)
  if (correct || state.turnStyle === 'turns') {
    newState = nextRound(newState);
  }

  return { correct, newState };
}

export function getWinner(state: GameState): PlayerState | null {
  if (state.status !== 'finished') return null;
  return state.players.reduce((best, p) => (p.score > best.score ? p : best), state.players[0]);
}
