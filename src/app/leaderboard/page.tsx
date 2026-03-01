import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

const MEDALS = ['🥇', '🥈', '🥉'];

export default async function LeaderboardPage() {
  const session = await auth();

  const stats = await prisma.userStats.findMany({
    orderBy: { gamesWon: 'desc' },
    take: 50,
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-indigo-600 font-semibold text-sm">
              &larr; Inicio
            </Link>
            <h1 className="text-2xl font-black text-gray-900">Leaderboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {stats.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Todavía no hay partidas registradas</p>
          </div>
        )}

        {stats.map((entry, i) => {
          const winRate = entry.gamesPlayed > 0
            ? Math.round((entry.gamesWon / entry.gamesPlayed) * 100)
            : 0;
          const isCurrentUser = session?.user?.id === entry.user.id;

          return (
            <div
              key={entry.id}
              className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4 ${
                isCurrentUser ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-200'
              }`}
            >
              <span className="text-xl w-8 text-center font-black text-gray-400">
                {MEDALS[i] || `${i + 1}`}
              </span>

              {entry.user.image ? (
                <img
                  src={entry.user.image}
                  alt=""
                  className="w-10 h-10 rounded-full border border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  {entry.user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{entry.user.name || 'Anónimo'}</p>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{entry.gamesPlayed} partidas</span>
                  <span>{winRate}% wins</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black text-indigo-600">{entry.gamesWon}</p>
                <p className="text-[10px] text-gray-400 font-semibold uppercase">victorias</p>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
