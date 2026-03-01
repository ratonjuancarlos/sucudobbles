'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAvailableDifficulties } from '@/engine/difficulty';
import { PlayerSetup } from '@/components/game/PlayerSetup';

const DIFF_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 border-green-300',
  normal: 'bg-blue-100 text-blue-700 border-blue-300',
  hard: 'bg-orange-100 text-orange-700 border-orange-300',
  expert: 'bg-pink-100 text-pink-700 border-pink-300',
};

interface DeckOption {
  id: string;
  name: string;
  _count: { faces: number };
}

function SetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedDeckId = searchParams.get('deckId');

  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState(preselectedDeckId || '');
  const [difficulty, setDifficulty] = useState<string>('');
  const [totalRounds, setTotalRounds] = useState(10);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [drunkMode, setDrunkMode] = useState(false);
  const [gameMode, setGameMode] = useState<'same_screen' | 'online'>('same_screen');
  const [hostName, setHostName] = useState('');
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'config' | 'players'>('config');

  useEffect(() => {
    fetch('/api/decks')
      .then((res) => res.json())
      .then((data) => {
        setDecks(data);
        setLoading(false);
        if (preselectedDeckId) setSelectedDeckId(preselectedDeckId);
      });
  }, [preselectedDeckId]);

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);
  const faceCount = selectedDeck?._count.faces ?? 0;
  const availableDifficulties = getAvailableDifficulties(faceCount);

  useEffect(() => {
    if (availableDifficulties.length > 0 && !difficulty) {
      setDifficulty(availableDifficulties[0].key);
    }
  }, [availableDifficulties, difficulty]);

  function handleStartGame(players: { name: string; color: string }[]) {
    const diff = availableDifficulties.find((d) => d.key === difficulty);
    if (!diff || !selectedDeckId) return;

    const config = {
      deckId: selectedDeckId,
      difficulty: diff.order,
      players,
      totalRounds,
      mode: 'same_screen' as const,
      timerSeconds,
      drunkMode,
    };

    sessionStorage.setItem('gameConfig', JSON.stringify(config));
    router.push('/game/play');
  }

  function handleCreateOnlineRoom() {
    const diff = availableDifficulties.find((d) => d.key === difficulty);
    if (!diff || !selectedDeckId || !hostName.trim()) return;

    const config = {
      deckId: selectedDeckId,
      difficulty: diff.order,
      totalRounds,
      timerSeconds,
      drunkMode,
      hostName: hostName.trim(),
    };

    sessionStorage.setItem('onlineConfig', JSON.stringify(config));
    router.push('/game/lobby/new');
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button onClick={() => router.back()} className="text-indigo-600 font-semibold text-sm">
            &larr; Volver
          </button>
          <h1 className="text-2xl font-black text-gray-900">Nueva partida</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          {step === 'config' ? (
            <>
              {/* Game mode */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  Modo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGameMode('same_screen')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      gameMode === 'same_screen'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-sm">Misma pantalla</div>
                    <div className="text-[11px] opacity-60 font-semibold">Todos en este dispositivo</div>
                  </button>
                  <button
                    onClick={() => setGameMode('online')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      gameMode === 'online'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-sm">Online</div>
                    <div className="text-[11px] opacity-60 font-semibold">Cada uno en su celular</div>
                  </button>
                </div>
              </div>

              {/* Deck selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  Mazo
                </label>
                <select
                  value={selectedDeckId}
                  onChange={(e) => {
                    setSelectedDeckId(e.target.value);
                    setDifficulty('');
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Seleccioná un mazo</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name} ({deck._count.faces} caras)
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              {selectedDeckId && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Dificultad
                  </label>
                  {availableDifficulties.length === 0 ? (
                    <p className="text-sm text-red-500 font-semibold">
                      Este mazo necesita al menos 7 caras
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {availableDifficulties.map((d) => (
                        <button
                          key={d.key}
                          onClick={() => setDifficulty(d.key)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            difficulty === d.key
                              ? `${DIFF_COLORS[d.key]} shadow-sm`
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-bold text-sm">{d.label}</div>
                          <div className="text-[11px] opacity-60 font-semibold">
                            {d.symbolsPerCard}/carta
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Rounds */}
              {difficulty && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Rondas
                  </label>
                  <div className="flex gap-2">
                    {[5, 10, 15, 20].map((n) => (
                      <button
                        key={n}
                        onClick={() => setTotalRounds(n)}
                        className={`flex-1 py-2.5 rounded-xl border font-bold text-lg transition-all ${
                          totalRounds === n
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Timer */}
              {difficulty && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    Timer por ronda
                  </label>
                  <div className="flex gap-2">
                    {([10, 15, 20, 30, null] as (number | null)[]).map((t) => (
                      <button
                        key={t ?? 'off'}
                        onClick={() => setTimerSeconds(t)}
                        className={`flex-1 py-2.5 rounded-xl border font-bold text-sm transition-all ${
                          timerSeconds === t
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        {t ? `${t}s` : 'Sin'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Drunk mode */}
              {difficulty && (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Modo Borracho
                    </span>
                    <p className="text-[11px] text-gray-400 font-semibold">Las caras se mueven!</p>
                  </div>
                  <button
                    onClick={() => setDrunkMode(!drunkMode)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      drunkMode ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                        drunkMode ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              )}

              {difficulty && gameMode === 'same_screen' && (
                <button
                  onClick={() => setStep('players')}
                  className="w-full bg-indigo-600 text-white font-bold text-lg py-4 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Elegir jugadores
                </button>
              )}

              {difficulty && gameMode === 'online' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                      Tu nombre
                    </label>
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="Tu nombre..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      maxLength={20}
                    />
                  </div>
                  <button
                    onClick={handleCreateOnlineRoom}
                    disabled={!hostName.trim()}
                    className="w-full bg-indigo-600 text-white font-bold text-lg py-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Crear sala
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('config')}
                className="text-indigo-600 font-semibold text-sm"
              >
                &larr; Cambiar configuración
              </button>
              <PlayerSetup onStart={handleStartGame} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function GameSetupPage() {
  return (
    <Suspense>
      <SetupContent />
    </Suspense>
  );
}
