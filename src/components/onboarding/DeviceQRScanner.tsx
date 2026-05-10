'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface Props {
  onScan:   (raw: string) => void;
  onError?: (msg: string) => void;
  onCancel: () => void;
}

/**
 * DeviceQRScanner
 *
 * Apre la camera posteriore del telefono e decodifica il QR fisico del device.
 * Alla prima lettura valida chiama onScan(rawString) e chiude la camera.
 *
 * Dipendenza: jsqr (lazy import per non appesantire il bundle iniziale)
 */
export default function DeviceQRScanner({ onScan, onError, onCancel }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  // ── Stop camera + animation loop ──────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (rafRef.current)  { cancelAnimationFrame(rafRef.current); rafRef.current  = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // ── Avvio camera ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator?.mediaDevices?.getUserMedia) {
        onError?.('Camera non disponibile su questo browser/connessione');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          onError?.(err instanceof Error ? err.message : 'Accesso camera negato');
        }
      }
    }

    start();
    return () => { cancelled = true; stopCamera(); };
  }, [stopCamera, onError]);

  // ── Decode loop ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!ready) return;

    let stopped = false;

    async function startLoop() {
      // Lazy import: jsqr caricato solo quando la camera è aperta
      let jsQR: ((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null) | null = null;
      try {
        jsQR = ((await import('jsqr')) as unknown as { default: typeof jsQR }).default;
      } catch {
        onError?.('QR decoder non disponibile');
        return;
      }

      function tick() {
        if (stopped) return;

        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR!(img.data, img.width, img.height);
        if (code?.data) {
          stopped = true;
          stopCamera();
          onScan(code.data);
          return;
        }

        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    startLoop();
    return () => { stopped = true; };
  }, [ready, onScan, onError, stopCamera]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-mono">
            Apertura camera...
          </div>
        )}

        {/* mirino centrale */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-hub-accent rounded-lg" />
        </div>
      </div>

      <p className="text-xs text-hub-muted text-center">
        Inquadra il QR sul dispositivo
      </p>

      <button
        onClick={() => { stopCamera(); onCancel(); }}
        className="w-full text-xs text-hub-muted underline py-1"
      >
        Annulla scansione
      </button>
    </div>
  );
}
