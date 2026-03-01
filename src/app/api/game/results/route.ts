import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json();
  const { deckId, players, totalRounds, mode } = body;

  if (!deckId || !players || !Array.isArray(players) || players.length === 0) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  // Find the winner
  const sorted = [...players].sort(
    (a: { score: number }, b: { score: number }) => b.score - a.score
  );
  const winnerName = sorted[0]?.name;

  // Create game record
  const game = await prisma.game.create({
    data: {
      roomCode: nanoid(8),
      status: 'FINISHED',
      mode: mode === 'online' ? 'ONLINE' : 'SAME_SCREEN',
      deckId,
      totalRounds: totalRounds || 10,
      finishedAt: new Date(),
      players: {
        create: players.map(
          (p: { name: string; score: number; color: string }, i: number) => ({
            name: p.name,
            score: p.score,
            color: p.color || '#3B82F6',
            // Link first player to current user (host)
            userId: i === 0 ? session.user.id : undefined,
          })
        ),
      },
    },
  });

  // Update user stats
  const isWinner = sorted[0]?.name === players[0]?.name;
  await prisma.userStats.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      gamesPlayed: 1,
      gamesWon: isWinner ? 1 : 0,
      totalCorrect: Math.max(0, players[0]?.score || 0),
      totalGuesses: totalRounds || 10,
    },
    update: {
      gamesPlayed: { increment: 1 },
      gamesWon: isWinner ? { increment: 1 } : undefined,
      totalCorrect: { increment: Math.max(0, players[0]?.score || 0) },
      totalGuesses: { increment: totalRounds || 10 },
    },
  });

  return NextResponse.json({ gameId: game.id }, { status: 201 });
}
