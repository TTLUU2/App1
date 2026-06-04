'use client';

// Photo step: the conversation's entry point. Three buttons that converge:
//   1. Take photo — native camera on mobile (file input with capture)
//   2. Upload    — file picker (saved photo)
//   3. Manual    — skip the photo, jump straight to the card picker question
//
// Both photo branches POST the captured image to /api/ocr/card and emit
// { matchedCardId, extracted } via onCaptured. The "manual" branch emits
// the manual signal so the parent state machine routes to a card picker.

import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, Pencil, RefreshCcw, Mic } from 'lucide-react';
import { speak } from '@/lib/tts';

interface OcrResult {
  matchedCardId: string | null;
  extracted: { last4: string | null; expiryMonthYear: string | null };
}

export function PhotoStep({
  onCaptured,
  onManual,
  onSpeak,
}: {
  onCaptured: (result: OcrResult) => void;
  onManual: () => void;
  /** Same destination as onManual (the picker step), but signals voice-first
   *  intent. Kept distinct so we could route differently later. */
  onSpeak: () => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Greet on mount — user just tapped FAB → Add Card, so the gesture is
  // fresh and audio.play() should pass autoplay checks. No cleanup so
  // StrictMode's dev double-fire doesn't kill the audio mid-play.
  const greetedRef = useRef(false);
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    void speak(
      "Let's add a card. Snap a photo, speak the card name, or pick it manually from the list.",
    );
  }, []);

  async function handleFile(file: File) {
    setError(null);
    setSubmitting(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      setPreview(dataUrl);
      const base64 = dataUrl.split(',')[1] ?? '';
      const mediaType = pickMediaType(file.type);
      const res = await fetch('/api/ocr/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType }),
      });
      const json = (await res.json()) as
        | {
            matchedCardId: string | null;
            extracted: { last4: string | null; expiryMonthYear: string | null };
          }
        | { error: string };
      if (!res.ok || 'error' in json) {
        throw new Error('error' in json ? json.error : 'OCR failed');
      }
      onCaptured(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Let&apos;s add a card. Snap a photo, speak the name, or pick from the list.
      </p>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Your card"
          className="mx-auto h-32 rounded-xl object-cover ring-1 ring-zinc-300 dark:ring-zinc-700"
        />
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-ph-red)] px-4 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-50"
        >
          <Camera className="h-4 w-4" aria-hidden />
          {submitting ? 'Reading your card…' : preview ? 'Retake photo' : 'Take photo'}
        </button>
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={onSpeak}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <Mic className="h-4 w-4" aria-hidden />
          Speak the card name
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Upload from file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={onManual}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          I&apos;ll pick it manually
        </button>
        {preview && !submitting && (
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setError(null);
            }}
            className="mt-1 inline-flex items-center justify-center gap-1 text-xs text-zinc-500 hover:underline"
          >
            <RefreshCcw className="h-3 w-3" aria-hidden />
            Start over
          </button>
        )}
      </div>

      <p className="text-[11px] text-zinc-500">
        We extract product, expiry, and last 4 only. PAN and CVV never leave the device or get
        stored.
      </p>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function pickMediaType(t: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (t === 'image/png') return 'image/png';
  if (t === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}
