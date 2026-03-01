/**
 * Generates Dobble/Spot-It card sets using finite projective plane construction.
 *
 * For a prime number n:
 * - Each card has (n + 1) symbols
 * - Total cards = n² + n + 1
 * - Total symbols = n² + n + 1
 * - Any two cards share exactly 1 symbol
 */

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

export function generateCards(n: number): number[][] {
  if (!isPrime(n)) {
    throw new Error(`Order n must be prime, got ${n}`);
  }

  const cards: number[][] = [];

  // Card 0: the "line at infinity" [0, 1, 2, ..., n]
  const firstCard: number[] = [];
  for (let i = 0; i <= n; i++) {
    firstCard.push(i);
  }
  cards.push(firstCard);

  // Next n cards: each passes through point at infinity 0
  for (let i = 0; i < n; i++) {
    const card: number[] = [0];
    for (let j = 0; j < n; j++) {
      card.push(n + 1 + n * i + j);
    }
    cards.push(card);
  }

  // Remaining n² cards
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const card: number[] = [i + 1];
      for (let k = 0; k < n; k++) {
        card.push(n + 1 + n * k + ((i * k + j) % n));
      }
      cards.push(card);
    }
  }

  return cards;
}

export function verifyDeck(cards: number[][]): boolean {
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const common = cards[i].filter((s) => cards[j].includes(s));
      if (common.length !== 1) return false;
    }
  }
  return true;
}

export function findMatch(card1: number[], card2: number[]): number {
  const set2 = new Set(card2);
  for (const symbol of card1) {
    if (set2.has(symbol)) return symbol;
  }
  throw new Error('No match found between cards - invalid deck');
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
