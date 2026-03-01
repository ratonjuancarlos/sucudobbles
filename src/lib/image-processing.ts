'use client';

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropFaceFromCanvas(
  source: HTMLImageElement | HTMLCanvasElement,
  box: FaceBox,
  targetSize: number = 200
): Promise<Blob> {
  const padding = 0.35;
  const padX = box.width * padding;
  const padY = box.height * padding;

  const cropX = Math.max(0, box.x - padX);
  const cropY = Math.max(0, box.y - padY);
  const cropW = box.width + padX * 2;
  const cropH = box.height + padY * 2;
  const side = Math.max(cropW, cropH);

  // Center the crop
  const centerX = cropX + cropW / 2;
  const centerY = cropY + cropH / 2;
  const finalX = centerX - side / 2;
  const finalY = centerY - side / 2;

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d')!;

  // Draw circular clip
  ctx.beginPath();
  ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(source, finalX, finalY, side, side, 0, 0, targetSize, targetSize);

  // White circular border
  ctx.beginPath();
  ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2 - 3, 0, Math.PI * 2);
  ctx.closePath();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/webp',
      0.85
    );
  });
}

export function createPreviewUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
