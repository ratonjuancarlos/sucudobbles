import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createDeckSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const decks = await prisma.deck.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { faces: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(decks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const deckCount = await prisma.deck.count({
    where: { userId: session.user.id },
  });

  if (deckCount >= 3) {
    return NextResponse.json(
      { error: 'Límite de 3 mazos alcanzado' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = createDeckSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const deck = await prisma.deck.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(deck, { status: 201 });
}
