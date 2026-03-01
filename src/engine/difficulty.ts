export interface DifficultyConfig {
  key: string;
  label: string;
  order: number;
  symbolsPerCard: number;
  totalSymbols: number;
  totalCards: number;
}

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    key: 'easy',
    label: 'Fácil',
    order: 2,
    symbolsPerCard: 3,
    totalSymbols: 7,
    totalCards: 7,
  },
  {
    key: 'normal',
    label: 'Normal',
    order: 3,
    symbolsPerCard: 4,
    totalSymbols: 13,
    totalCards: 13,
  },
  {
    key: 'hard',
    label: 'Difícil',
    order: 5,
    symbolsPerCard: 6,
    totalSymbols: 31,
    totalCards: 31,
  },
  {
    key: 'expert',
    label: 'Experto',
    order: 7,
    symbolsPerCard: 8,
    totalSymbols: 57,
    totalCards: 57,
  },
];

export function getDifficulty(key: string): DifficultyConfig {
  const diff = DIFFICULTIES.find((d) => d.key === key);
  if (!diff) throw new Error(`Unknown difficulty: ${key}`);
  return diff;
}

export function getDifficultyByOrder(order: number): DifficultyConfig {
  const diff = DIFFICULTIES.find((d) => d.order === order);
  if (!diff) throw new Error(`Unknown order: ${order}`);
  return diff;
}

export function getAvailableDifficulties(faceCount: number): DifficultyConfig[] {
  return DIFFICULTIES.filter((d) => faceCount >= d.totalSymbols);
}

export function getNextRequirement(faceCount: number): { difficulty: DifficultyConfig; needed: number } | null {
  const next = DIFFICULTIES.find((d) => faceCount < d.totalSymbols);
  if (!next) return null;
  return { difficulty: next, needed: next.totalSymbols - faceCount };
}
