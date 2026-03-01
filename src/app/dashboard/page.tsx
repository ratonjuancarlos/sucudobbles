import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const decks = await prisma.deck.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { faces: true } },
      faces: { take: 1, orderBy: { createdAt: 'asc' }, select: { imageUrl: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-black text-gray-900">
            Sucu<span className="text-indigo-600">dobble</span>
          </h1>
          <div className="flex items-center gap-3">
            <Link href="/leaderboard" className="text-indigo-600 font-semibold text-sm hover:underline">
              Ranking
            </Link>
            <Link href="/game/join" className="text-indigo-600 font-semibold text-sm hover:underline">
              Unirse
            </Link>
            <span className="text-sm text-gray-500">{session.user.name}</span>
            {session.user.image && (
              <img
                src={session.user.image}
                alt=""
                className="w-8 h-8 rounded-full border border-gray-200"
              />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900">Mis Mazos</h2>
          {decks.length < 3 && (
            <Link
              href="/decks/new"
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Nuevo
            </Link>
          )}
        </div>

        {decks.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
            <p className="text-lg font-semibold text-gray-500">
              Todavía no tenés ningún mazo
            </p>
            <Link
              href="/decks/new"
              className="inline-block bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Crear mi primer mazo
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {decks.map((deck) => (
            <Link
              key={deck.id}
              href={`/decks/${deck.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 block hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {deck.faces[0] ? (
                  <img
                    src={deck.faces[0].imageUrl}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-black text-indigo-600 shrink-0">
                    {deck.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg truncate">{deck.name}</h3>
                  {deck.description && (
                    <p className="text-gray-500 text-sm truncate">{deck.description}</p>
                  )}
                  <div className="mt-2">
                    <span className="inline-block bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {deck._count.faces} caras
                    </span>
                  </div>
                </div>
                <span className="text-gray-300 text-2xl font-bold">&rsaquo;</span>
              </div>
            </Link>
          ))}
        </div>

        {decks.length >= 3 && (
          <p className="text-sm text-gray-400 text-center">
            Límite de 3 mazos (gratis)
          </p>
        )}
      </main>
    </div>
  );
}
