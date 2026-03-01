import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/storage';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ deckId: string; faceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { deckId, faceId } = await params;

  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: session.user.id },
  });

  if (!deck) {
    return NextResponse.json({ error: 'Mazo no encontrado' }, { status: 404 });
  }

  const face = await prisma.face.findFirst({
    where: { id: faceId, deckId },
  });

  if (!face) {
    return NextResponse.json({ error: 'Cara no encontrada' }, { status: 404 });
  }

  await deleteFile(face.imageKey);
  await prisma.face.delete({ where: { id: faceId } });

  return NextResponse.json({ ok: true });
}
