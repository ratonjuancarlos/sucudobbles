'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAvailableDifficulties, getNextRequirement } from '@/engine/difficulty';

interface Face {
  id: string;
  label: string;
  imageUrl: string;
}

interface Deck {
  id: string;
  name: string;
  description: string | null;
  faces: Face[];
  _count: { faces: number };
}

const DIFF_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  normal: 'bg-blue-100 text-blue-700',
  hard: 'bg-orange-100 text-orange-700',
  expert: 'bg-pink-100 text-pink-700',
};

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadDeck = useCallback(async () => {
    const res = await fetch(`/api/decks/${deckId}`);
    if (!res.ok) {
      router.push('/dashboard');
      return;
    }
    setDeck(await res.json());
    setLoading(false);
  }, [deckId, router]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  async function deleteFace(faceId: string) {
    setDeleting(faceId);
    await fetch(`/api/decks/${deckId}/faces/${faceId}`, { method: 'DELETE' });
    await loadDeck();
    setDeleting(null);
  }

  async function deleteDeck() {
    if (!confirm('Eliminar este mazo y todas sus caras?')) return;
    await fetch(`/api/decks/${deckId}`, { method: 'DELETE' });
    router.push('/dashboard');
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!deck) return null;

  const faceCount = deck.faces.length;
  const available = getAvailableDifficulties(faceCount);
  const next = getNextRequirement(faceCount);

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-indigo-600 font-semibold text-sm">
              &larr; Mis Mazos
            </Link>
            <h1 className="text-xl font-black text-gray-900 truncate">{deck.name}</h1>
          </div>
          <button
            onClick={deleteDeck}
            className="text-red-500 font-semibold text-xs px-3 py-1 rounded-full border border-red-200 hover:bg-red-50 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Difficulty badges */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
          <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Dificultades</h3>
          {available.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Subí al menos 7 caras para jugar
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {available.map((d) => (
                <span key={d.key} className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${DIFF_COLORS[d.key]}`}>
                  {d.label} - {d.symbolsPerCard}/carta
                </span>
              ))}
            </div>
          )}
          {next && (
            <p className="text-sm text-gray-500">
              +{next.needed} cara{next.needed !== 1 ? 's' : ''} para{' '}
              <span className="text-indigo-600 font-bold">{next.difficulty.label}</span>
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Link
            href={`/decks/${deckId}/upload`}
            className="flex-1 text-center bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Subir caras
          </Link>
          {available.length > 0 && (
            <Link
              href={`/game/setup?deckId=${deckId}`}
              className="flex-1 text-center bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Jugar!
            </Link>
          )}
        </div>

        {/* Face grid */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">
            Caras ({faceCount})
          </h3>

          {faceCount === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No hay caras todavía</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {deck.faces.map((face) => (
                <div key={face.id} className="relative group">
                  <div className="aspect-square rounded-full overflow-hidden border-2 border-gray-200 bg-white">
                    <img
                      src={face.imageUrl}
                      alt={face.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-[11px] text-center text-gray-500 mt-1 truncate">
                    {face.label}
                  </p>
                  <button
                    onClick={() => deleteFace(face.id)}
                    disabled={deleting === face.id}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
