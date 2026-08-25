'use client';

// In-place voice capture — opened when the user taps the FAB's Ask
// action (or any other 'speak now' trigger). Sits as a floating pill
// above the tab bar on whatever screen the user is on. Recording
// starts immediately on mount; the transcript renders live inside the
// pill (words appear as the user speaks). On speech end with a non-
// empty transcript, we stash the question in sessionStorage and
// navigate to /ask which auto-submits and shows the answer.
//
// Matches the pre-Lacquer 'tap mic → recording starts, pulse animation
// dictates what the user is saying in real time' pattern. Only jumps
// to the Copilot chat surface when the user has actually said
// something worth answering.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, X } from 'lucide-react';
import {
  getSpeechRecognitionCtor,
  type SpeechRecognitionInstance,
  type SpeechRecognitionResultEvent,
} from '@/lib/speech';

export function VoiceCaptureOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (!open) return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Voice input not supported here.');
      return;
    }

    setTranscript('');
    setError(null);
    let finalText = '';
    const r = new Ctor();
    r.lang = 'en-AU';
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;

    r.onresult = (event: SpeechRecognitionResultEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const alt = result[0];
        if (!alt) continue;
        if (result.isFinal) finalText += alt.transcript;
        else interim += alt.transcript;
      }
      setTranscript((finalText + interim).trim());
    };

    r.onerror = (event) => {
      const code = event.error ?? 'unknown';
      if (code === 'no-speech') {
        onClose();
        return;
      }
      setError(code === 'not-allowed' ? 'Microphone permission denied.' : `Voice error: ${code}`);
    };

    r.onend = () => {
      const finished = finalText.trim();
      if (finished.length > 0) {
        try {
          sessionStorage.setItem(
            'ph:ask-seed',
            JSON.stringify({ question: finished, autoSubmit: true }),
          );
        } catch {
          /* private-mode Safari — falls through to ?q= param */
        }
        router.push(`/ask?q=${encodeURIComponent(finished)}`);
      }
      onClose();
    };

    recognitionRef.current = r;
    try {
      r.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }

    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberate mount-when-open; router/onClose are stable within a mount.
  }, [open]);

  function stop() {
    // Trigger onend via .stop() so we go through the normal completion
    // path (which navigates if the transcript is non-empty). Falls
    // through to onClose in the caller if abort races.
    try {
      recognitionRef.current?.stop();
    } catch {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop — tap-outside cancels (matches how the fan closes on
          outside tap). Uses the same brick-tinted scrim as the fan so
          the two feel like siblings. */}
      <button
        type="button"
        aria-label="Cancel voice capture"
        onClick={onClose}
        className="fixed inset-0 z-40 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(46,10,8,0.42)' }}
      />

      {/* Floating pill positioned above the FAB. Layout mirrors the
          /today CopilotBar in listening state — pulsing red mic
          left, live transcript centre, stop button right — so the
          user's mental model of 'listening state' is consistent
          across surfaces. */}
      <div
        className="fixed inset-x-0 z-50 mx-auto max-w-md px-6"
        style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
      >
        <div
          className="flex items-center gap-3 rounded-full border border-ph-border-strong bg-ph-card px-4 py-3"
          style={{ boxShadow: 'var(--shadow-ph-fab)' }}
        >
          <span
            className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ph-red text-white motion-reduce:animate-none animate-pulse"
            aria-hidden
          >
            <Mic className="h-4 w-4" />
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] text-ph-ink">
            {error ?? (transcript || 'Listening…')}
          </p>
          <button
            type="button"
            onClick={stop}
            aria-label="Stop and send"
            className="grid h-8 w-8 flex-none place-items-center rounded-full border border-ph-border-strong bg-ph-card text-ph-text-muted transition-colors hover:bg-ph-fill-warm hover:text-ph-text"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}
