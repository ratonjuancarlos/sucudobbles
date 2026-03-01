import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const stats = await prisma.userStats.findMany({
    orderBy: { gamesWon: 'desc' },
    take: 50,
    include: {
      user: {
        select: { name: true, image: true },
      },
    },
  });

  return NextResponse.json(stats);
}
