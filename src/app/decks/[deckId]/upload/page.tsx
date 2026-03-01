'use client';

import { useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { detectFaces, getFaceBox } from '@/lib/face-detection';
import { cropFaceFromCanvas, createPreviewUrl, revokePreviewUrl } from '@/lib/image-processing';
import type { FaceBox } from '@/lib/image-processing';

interface DetectedFace {
  box: FaceBox;
  previewUrl: string;
  blob: Blob;
  label: string;
  approved: boolean;
}

export default function UploadPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [detecting, setDetecting] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setDetectedFaces([]);

    const url = URL.createObjectURL(file);
    setImageUrl(url);

    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    setDetecting(true);

    try {
      // Draw image to canvas first - face-api.js works better with canvas
      // Also scale down very large images to improve performance
      const MAX_DIM = 1024;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const scale = Math.min(1, MAX_DIM / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      // Detect faces on the canvas (more reliable than on img element)
      const detections = await detectFaces(canvas);

      if (detections.length === 0) {
        setError('No se detectaron caras. Probá con una foto donde se vea bien la cara de frente, con buena iluminación.');
        setDetecting(false);
        return;
      }

      const faces: DetectedFace[] = [];
      for (const detection of detections) {
        const box = getFaceBox(detection);
        const blob = await cropFaceFromCanvas(canvas, box);
        const previewUrl = createPreviewUrl(blob);
        faces.push({ box, previewUrl, blob, label: '', approved: false });
      }

      setDetectedFaces(faces);
    } catch (err) {
      console.error('[upload] Face detection error:', err);
      setError('Error al detectar caras. Probá con otra imagen.');
    } finally {
      setDetecting(false);
    }
  }, []);

  function updateLabel(index: number, label: string) {
    setDetectedFaces((prev) => prev.map((f, i) => (i === index ? { ...f, label } : f)));
  }

  function toggleApproval(index: number) {
    setDetectedFaces((prev) => prev.map((f, i) => (i === index ? { ...f, approved: !f.approved } : f)));
  }

  async function uploadApproved() {
    const toUpload = detectedFaces.filter((f) => f.approved && f.label.trim());
    if (toUpload.length === 0) return;

    setUploading(true);
    let count = 0;

    for (const face of toUpload) {
      const formData = new FormData();
      formData.append('file', face.blob, 'face.webp');
      formData.append('label', face.label.trim());

      const res = await fetch(`/api/decks/${deckId}/faces`, { method: 'POST', body: formData });
      if (res.ok) count++;
    }

    setUploadedCount((prev) => prev + count);
    setUploading(false);

    detectedFaces.forEach((f) => revokePreviewUrl(f.previewUrl));
    if (imageUrl) revokePreviewUrl(imageUrl);
    setDetectedFaces([]);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function reset() {
    detectedFaces.forEach((f) => revokePreviewUrl(f.previewUrl));
    if (imageUrl) revokePreviewUrl(imageUrl);
    setDetectedFaces([]);
    setImageUrl(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <button onClick={() => router.push(`/decks/${deckId}`)} className="text-indigo-600 font-semibold text-sm">
              &larr; Volver al mazo
            </button>
            <h1 className="text-xl font-black text-gray-900">Subir caras</h1>
          </div>
          {uploadedCount > 0 && (
            <span className="inline-block bg-green-100 text-green-700 text-sm font-semibold px-2.5 py-1 rounded-full">
              +{uploadedCount}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* File picker */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center space-y-3">
          <p className="text-gray-500 text-sm">
            Seleccioná una foto con una o más caras
          </p>
          <label className="inline-block bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer">
            Elegir foto
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        {/* Detecting spinner */}
        {detecting && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-gray-500">Buscando caras...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600 text-sm font-semibold text-center">{error}</p>
          </div>
        )}

        {/* Detected faces */}
        {detectedFaces.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h3 className="font-bold text-gray-900 text-center">
              {detectedFaces.length} cara{detectedFaces.length !== 1 ? 's' : ''} detectada{detectedFaces.length !== 1 ? 's' : ''}!
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {detectedFaces.map((face, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-3 text-center transition-all ${
                    face.approved
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-2 border-2 border-gray-200">
                    <img src={face.previewUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <input
                    type="text"
                    value={face.label}
                    onChange={(e) => updateLabel(i, e.target.value)}
                    placeholder="Nombre"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => toggleApproval(i)}
                    className={`w-full text-sm py-1.5 rounded-lg font-semibold transition-colors ${
                      face.approved
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {face.approved ? 'Aprobada!' : 'Aprobar'}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={uploadApproved}
                disabled={uploading || !detectedFaces.some((f) => f.approved && f.label.trim())}
                className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Subiendo...' : 'Subir'}
              </button>
              <button
                onClick={reset}
                className="bg-white border border-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
