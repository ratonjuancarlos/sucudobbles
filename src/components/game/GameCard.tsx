'use client';

import { useMemo } from 'react';
import type { CardDisplay, FaceData } from '@/types/game';

interface GameCardProps {
  card: CardDisplay;
  faces: FaceData[];
  onFaceTap: (faceIndex: number) => void;
  disabled?: boolean;
  highlightFace?: number | null;
  highlightColor?: 'green' | 'red' | 'blue' | null;
  drunkMode?: boolean;
}

export function GameCard({
  card,
  faces,
  onFaceTap,
  disabled = false,
  highlightFace = null,
  highlightColor = null,
  drunkMode = false,
}: GameCardProps) {
  // Generate stable random drunk animation params per face
  const drunkParams = useMemo(() => {
    return card.faces.map(() => ({
      duration: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 2,
    }));
  }, [card.faces.length]);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-md relative overflow-hidden w-full aspect-video">
      {card.faces.map((facePos, i) => {
        const face = faces[facePos.faceIndex];
        if (!face) return null;

        const isHighlighted = highlightFace === facePos.faceIndex;

        // In drunk mode, the container stays still but the inner content wobbles
        const containerStyle: React.CSSProperties = {
          left: `${facePos.x}%`,
          top: `${facePos.y}%`,
          width: `${facePos.size}%`,
          height: `${facePos.size * (16 / 9)}%`,
          transform: `translate(-50%, -50%)`,
        };

        const innerStyle: React.CSSProperties = drunkMode
          ? {
              '--rot': `${facePos.rotation}deg`,
              '--drunk-duration': `${drunkParams[i].duration}s`,
              '--drunk-delay': `${drunkParams[i].delay}s`,
            } as React.CSSProperties
          : {
              transform: `rotate(${facePos.rotation}deg)`,
            };

        return (
          <button
            key={facePos.faceIndex}
            onClick={() => !disabled && onFaceTap(facePos.faceIndex)}
            disabled={disabled}
            className="absolute focus:outline-none"
            style={containerStyle}
          >
            <div
              className={`w-full h-full ${drunkMode ? 'animate-drunk' : ''}`}
              style={innerStyle}
            >
              <div
                className={`rounded-full border-2 border-gray-300 overflow-hidden cursor-pointer w-full h-full transition-transform hover:scale-110 active:scale-95 ${
                  isHighlighted && highlightColor === 'green'
                    ? 'border-green-500 ring-4 ring-green-300 scale-110'
                    : isHighlighted && highlightColor === 'red'
                      ? 'border-red-500 ring-4 ring-red-300 animate-shake'
                      : isHighlighted && highlightColor === 'blue'
                        ? 'border-indigo-500 ring-4 ring-indigo-300 scale-110'
                        : isHighlighted && !highlightColor
                          ? 'border-yellow-400 ring-4 ring-yellow-200 scale-110'
                          : ''
                }`}
              >
                <img
                  src={face.imageUrl}
                  alt={face.label}
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              </div>
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] text-gray-500 whitespace-nowrap font-semibold bg-white/90 px-1.5 py-0.5 rounded-full border border-gray-100">
                {face.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
