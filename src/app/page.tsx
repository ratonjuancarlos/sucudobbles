import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
      <div className="text-center space-y-8 max-w-sm">
        <div className="space-y-2">
          <h1 className="text-5xl sm:text-6xl font-black text-gray-900 tracking-tight">
            Sucu<span className="text-indigo-600">dobble</span>
          </h1>
          <p className="text-lg text-gray-500">
            Encontrá la cara repetida entre dos cartas
          </p>
        </div>

        <p className="text-gray-600 leading-relaxed">
          Subí fotos, armá tu mazo y jugá con amigos.
          <span className="text-indigo-600 font-semibold"> El más rápido gana!</span>
        </p>

        <Link
          href="/dashboard"
          className="inline-block bg-indigo-600 text-white font-bold text-lg px-10 py-4 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          A jugar!
        </Link>
      </div>
    </main>
  );
}
