'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { connected, emit } = useSocket();

  const [roomCode, setRoomCode] = useState(searchParams.get('room') || '');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!roomCode.trim() || !playerName.trim() || !connected) return;

    setJoining(true);
    setError('');

    const trimmedName = playerName.trim();
    const code = roomCode.trim().toUpperCase();
    console.log('[join] Emitting join-room. code:', code, 'name:', trimmedName, 'connected:', connected);
    emit('join-room', { roomCode: code, playerName: trimmedName }, (response) => {
      console.log('[join] join-room response:', response);
      if (response.success) {
        // Store for rejoin on reconnect
        sessionStorage.setItem('playerName', trimmedName);
        router.push(`/game/lobby/${code}`);
      } else {
        setError(response.error || 'Error al unirse');
        setJoining(false);
      }
    });
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button onClick={() => router.back()} className="text-indigo-600 font-semibold text-sm">
            &larr; Volver
          </button>
          <h1 className="text-2xl font-black text-gray-900">Unirse a partida</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleJoin} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Código de sala
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Ej: ABC123"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-center text-2xl font-black tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              Tu nombre
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Tu nombre..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              maxLength={20}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-600 text-sm font-semibold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={joining || !connected || !roomCode.trim() || !playerName.trim()}
            className="w-full bg-indigo-600 text-white font-bold text-lg py-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!connected ? 'Conectando...' : joining ? 'Uniéndose...' : 'Unirse'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  );
}
