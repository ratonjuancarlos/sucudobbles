import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/storage';
import { nanoid } from 'nanoid';

const MAX_FACES_PER_DECK = 57;
const MAX_FILE_SIZE = 200 * 1024; // 200KB

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
  });

  if (!deck) {
    return NextResponse.json({ error: 'Mazo no encontrado' }, { status: 404 });
  }

  const faces = await prisma.face.findMany({
    where: { deckId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(faces);
}

export async function POST(
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
    include: { _count: { select: { faces: true } } },
  });

  if (!deck) {
    return NextResponse.json({ error: 'Mazo no encontrado' }, { status: 404 });
  }

  if (deck._count.faces >= MAX_FACES_PER_DECK) {
    return NextResponse.json(
      { error: `Máximo ${MAX_FACES_PER_DECK} caras por mazo` },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const label = formData.get('label') as string | null;

  if (!file || !label) {
    return NextResponse.json(
      { error: 'Se requiere archivo y nombre' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'Archivo demasiado grande (máx 200KB)' },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileId = nanoid(12);
  const key = `${deckId}/${fileId}.webp`;

  const imageUrl = await uploadFile(key, buffer, 'image/webp');

  const face = await prisma.face.create({
    data: {
      label,
      imageUrl,
      imageKey: key,
      deckId,
    },
  });

  return NextResponse.json(face, { status: 201 });
}
