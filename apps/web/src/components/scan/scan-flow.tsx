'use client';

// Camera capture → POST to /api/ocr/card → stash prefill in sessionStorage →
// redirect to /add-card which reads it on mount.
//
// Uses the browser's getUserMedia API directly (no react-camera library) —
// keeps the bundle small and the permission flow visible. Privacy: the
// captured image stays in volatile memory; we send it in one POST and never
// store it client-side.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Camera, RefreshCcw, CheckCircle2, AlertTriangle } from 'lucide-react';

const PREFILL_KEY = 'ph:add-card:prefill';

type Phase = 'ready' | 'starting' | 'preview' | 'captured' | 'processing' | 'error';

export function ScanFlow() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>('ready');
  const [capturedBlob, setCapturedBlob] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tear down stream on unmount or phase change away from preview.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startCamera() {
    setError(null);
    setPhase('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedBlob(dataUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPhase('captured');
  }

  function retake() {
    setCapturedBlob(null);
    void startCamera();
  }

  async function submit() {
    if (!capturedBlob) return;
    setPhase('processing');
    setError(null);
    try {
      const base64 = capturedBlob.split(',')[1] ?? '';
      const res = await fetch('/api/ocr/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType: 'image/jpeg' }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const errMsg =
          typeof json === 'object' && json !== null && 'error' in json
            ? String((json as { error: unknown }).error)
            : 'OCR request failed';
        throw new Error(errMsg);
      }
      // Stash the prefill — the add-card form reads it on mount.
      sessionStorage.setItem(PREFILL_KEY, JSON.stringify(json));
      router.push('/add-card?from=scan');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }

  return (
    <main className="flex-1 px-4 pb-6">
      <div className="flex items-center pt-2">
        <Link
          href="/"
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      <header className="mt-2 flex items-center gap-2">
        <Camera className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        <h1 className="text-lg font-semibold tracking-tight">Scan card</h1>
      </header>
      <p className="mt-1 text-xs text-zinc-500">
        We extract product, last 4, and expiry only. The full card number is never asked for or
        stored.
      </p>

      <div className="relative mt-4 aspect-[1.586/1] overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
        {/* Live preview */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={phase === 'preview' ? 'h-full w-full object-cover' : 'hidden'}
        />
        {/* Captured still */}
        {(phase === 'captured' || phase === 'processing') && capturedBlob && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedBlob} alt="Captured card" className="h-full w-full object-cover" />
        )}
        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Card outline overlay */}
        {(phase === 'preview' || phase === 'captured') && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-3 rounded-xl border-2 border-white/80 shadow-[0_0_0_100vmax_rgba(0,0,0,0.3)]"
          />
        )}

        {/* Idle prompt */}
        {phase === 'ready' && (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-zinc-200">
            <span>Tap below to start your camera.</span>
          </div>
        )}
        {phase === 'starting' && (
          <div className="flex h-full items-center justify-center text-sm text-zinc-200">
            Requesting camera permission…
          </div>
        )}
        {phase === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-sm text-white">
            Analysing card with Claude Vision…
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
          <div>
            <div className="font-medium">Couldn&apos;t complete the scan</div>
            <div className="mt-0.5">{error}</div>
            <Link href="/add-card" className="mt-2 inline-block underline">
              Add card manually instead
            </Link>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {phase === 'ready' && (
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-ph-red)] px-4 py-3 text-sm font-medium text-white"
          >
            <Camera className="h-4 w-4" aria-hidden />
            Start camera
          </button>
        )}
        {phase === 'preview' && (
          <button
            type="button"
            onClick={capture}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-ph-red)] px-4 py-3 text-sm font-medium text-white"
          >
            Capture
          </button>
        )}
        {phase === 'captured' && (
          <>
            <button
              type="button"
              onClick={submit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-ph-red)] px-4 py-3 text-sm font-medium text-white"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Use this photo
            </button>
            <button
              type="button"
              onClick={retake}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden />
              Retake
            </button>
          </>
        )}
        {phase === 'error' && (
          <button
            type="button"
            onClick={() => setPhase('ready')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            Try again
          </button>
        )}
      </div>

      <p className="mt-3 text-[11px] text-zinc-500">
        The captured image is sent to Anthropic&apos;s Claude API for one request only; it is not
        stored on our side. Anthropic&apos;s default API terms exclude training on inputs.
      </p>
    </main>
  );
}

/** Read + clear any pending OCR prefill stashed by /scan. */
export function readPendingPrefill(): {
  cardId?: string;
  last4?: string;
  expiryMonthYear?: string;
} | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PREFILL_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PREFILL_KEY);
  try {
    const parsed = JSON.parse(raw) as {
      extracted?: { last4?: string | null; expiryMonthYear?: string | null };
      matchedCardId?: string | null;
    };
    const result: { cardId?: string; last4?: string; expiryMonthYear?: string } = {};
    if (parsed.matchedCardId) result.cardId = parsed.matchedCardId;
    if (parsed.extracted?.last4) result.last4 = parsed.extracted.last4;
    if (parsed.extracted?.expiryMonthYear)
      result.expiryMonthYear = parsed.extracted.expiryMonthYear;
    return result;
  } catch {
    return null;
  }
}
