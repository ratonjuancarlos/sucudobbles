import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/storage';
import { z } from 'zod';

const updateDeckSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { deckId } = await params;

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: session.user.id },
    include: {
      faces: { orderBy: { createdAt: 'asc' } },
      _count: { select: { faces: true } },
    },
  });

  if (!deck) {
    return NextResponse.json({ error: 'Mazo no encontrado' }, { status: 404 });
  }

  return NextResponse.json(deck);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { deckId } = await params;

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: session.user.id },
  });

  if (!deck) {
    return NextResponse.json({ error: 'Mazo no encontrado' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateDeckSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.deck.update({
    where: { id: deckId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { deckId } = await params;

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: session.user.id },
    include: { faces: true },
  });

  if (!deck) {
    return NextResponse.json({ error: 'Mazo no encontrado' }, { status: 404 });
  }

  // Delete face images from storage
  await Promise.all(deck.faces.map((face) => deleteFile(face.imageKey)));

  // Cascade deletes faces
  await prisma.deck.delete({ where: { id: deckId } });

  return NextResponse.json({ ok: true });
}
