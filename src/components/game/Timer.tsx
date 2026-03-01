'use client';

interface TimerProps {
  secondsLeft: number | null;
  totalSeconds: number | null;
}

export function Timer({ secondsLeft, totalSeconds }: TimerProps) {
  if (secondsLeft === null || totalSeconds === null) return null;

  const fraction = secondsLeft / totalSeconds;
  const isUrgent = secondsLeft <= 3 && secondsLeft > 0;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);

  return (
    <div className={`flex items-center gap-1.5 ${isUrgent ? 'animate-pulse' : ''}`}>
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle
          cx="22" cy="22" r={radius}
          fill="none"
          stroke={isUrgent ? '#EF4444' : '#E5E7EB'}
          strokeWidth="4"
        />
        <circle
          cx="22" cy="22" r={radius}
          fill="none"
          stroke={isUrgent ? '#EF4444' : '#6366F1'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className={`text-lg font-black tabular-nums ${isUrgent ? 'text-red-500' : 'text-gray-700'}`}>
        {secondsLeft}
      </span>
    </div>
  );
}
