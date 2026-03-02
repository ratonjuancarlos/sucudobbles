'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  url: string;
  size?: number;
}

export function QRCodeDisplay({ url, size = 180 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current && url) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: { dark: '#1e1b4b', light: '#ffffff' },
      });
    }
  }, [url, size]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} />
      <div className="flex items-center gap-2 max-w-[260px]">
        <p className="text-[10px] text-gray-400 break-all flex-1">{url}</p>
        <button
          onClick={copyUrl}
          className="shrink-0 text-xs font-semibold px-2 py-1 rounded-lg border transition-colors"
          style={copied
            ? { borderColor: '#10b981', color: '#10b981', backgroundColor: '#f0fdf4' }
            : { borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: '#f9fafb' }
          }
        >
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}
