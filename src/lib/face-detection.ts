'use client';

import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;

  // Prevent multiple simultaneous loads
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const MODEL_URL = '/models';
      console.log('[face-detection] Loading models from', MODEL_URL);

      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      console.log('[face-detection] TinyFaceDetector loaded');

      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      console.log('[face-detection] FaceLandmark68Net loaded');

      modelsLoaded = true;
      console.log('[face-detection] All models ready');
    } catch (err) {
      console.error('[face-detection] Failed to load models:', err);
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}

export async function detectFaces(
  image: HTMLImageElement | HTMLCanvasElement
): Promise<faceapi.FaceDetection[]> {
  await loadModels();

  console.log('[face-detection] Detecting faces, image size:',
    image instanceof HTMLImageElement
      ? `${image.naturalWidth}x${image.naturalHeight}`
      : `${image.width}x${image.height}`
  );

  // Try multiple input sizes for better detection
  const inputSizes = [416, 320, 224, 160];

  for (const inputSize of inputSizes) {
    try {
      const detections = await faceapi.detectAllFaces(
        image,
        new faceapi.TinyFaceDetectorOptions({
          inputSize,
          scoreThreshold: 0.3  // Lower threshold for better recall
        })
      );

      console.log(`[face-detection] inputSize=${inputSize}: found ${detections.length} face(s)`);

      if (detections.length > 0) {
        return detections;
      }
    } catch (err) {
      console.warn(`[face-detection] Failed with inputSize=${inputSize}:`, err);
    }
  }

  return [];
}

export function getFaceBox(detection: faceapi.FaceDetection) {
  const box = detection.box;
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  };
}
