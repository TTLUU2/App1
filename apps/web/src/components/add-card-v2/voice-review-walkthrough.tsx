'use client';

// Voice walkthrough for the Add Card review screen. After the parent has
// spoken the 4-field summary on mount, this component shows a "Tap to edit
// by voice" button. Tapping starts a conversational loop:
//
//   greet → listen → parse → apply update → speak confirmation → listen → …
//
// The loop exits when the user says save/looks-good (commits via onSave),
// says cancel, or after two consecutive 'unclear' parses (silent exit).
// User can also tap the active mic at any time to stop.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { cancelSpeech, speak } from '@/lib/tts';
import {
  getSpeechRecognitionCtor,
  isSpeechRecognitionAvailable,
  type SpeechRecognitionInstance,
} from '@/lib/speech';
import { todayIsoDate } from '@/lib/time';

type Phase = 'idle' | 'greeting' | 'listening' | 'parsing' | 'speaking';

export type ReviewField =
  | 'activationDate'
  | 'annualFeeNextDueDate'
  | 'bonusTarget'
  | 'bonusSpendWindowEndDate';

interface CurrentValues {
  activationDate: string;
  annualFeeNextDueDate: string;
  bonusTarget: number;
  bonusSpendWindowEndDate: string;
}

interface ParseResult {
  kind: 'update' | 'save' | 'cancel' | 'unclear';
  field: ReviewField | null;
  newValue: string | null;
  spokenResponse: string;
  confidence: 'high' | 'medium' | 'low';
}

interface Props {
  cardName: string;
  current: CurrentValues;
  onUpdate: (field: ReviewField, value: string | number) => void;
  onSave: () => void;
}

export function VoiceReviewWalkthrough({ cardName, current, onUpdate, onSave }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const unclearCountRef = useRef(0);
  const supported = isSpeechRecognitionAvailable();

  // Keep current values + callbacks in refs so the recognition lifecycle
  // callbacks always see fresh values without re-binding on every parent
  // re-render (which would tear down an in-flight recognition session).
  const currentRef = useRef(current);
  const onUpdateRef = useRef(onUpdate);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    currentRef.current = current;
    onUpdateRef.current = onUpdate;
    onSaveRef.current = onSave;
  });

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    cancelSpeech();
    setPhase('idle');
    setTranscript('');
    unclearCountRef.current = 0;
  }, []);

  // Cleanup on unmount only (the [] dep means React strict-mode dev
  // double-fires but stop() is idempotent so we tolerate it).
  useEffect(() => () => stop(), [stop]);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Voice input not supported in this browser.');
      setPhase('idle');
      return;
    }
    try {
      const r = new Ctor();
      r.lang = 'en-AU';
      r.interimResults = true;
      r.continuous = false;
      r.maxAlternatives = 1;

      let finalText = '';
      r.onresult = (event) => {
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
        setError(
          code === 'not-allowed'
            ? 'Microphone permission denied.'
            : code === 'no-speech'
              ? null
              : `Voice error: ${code}`,
        );
        setPhase('idle');
      };
      r.onend = () => {
        const trimmed = finalText.trim();
        if (trimmed.length > 0) {
          void handleParse(trimmed);
        } else {
          // Nothing captured — exit quietly rather than re-prompting and
          // potentially looping forever in silence.
          setPhase('idle');
        }
      };

      recognitionRef.current = r;
      r.start();
      setError(null);
      setPhase('listening');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('idle');
    }
    // handleParse is declared below; useCallback with empty deps is fine
    // because we read latest via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakAndContinue = useCallback(
    async (text: string, resumeAfter: boolean) => {
      setPhase('speaking');
      try {
        await speak(text);
      } catch {
        /* fall through */
      }
      if (resumeAfter) {
        startListening();
      } else {
        setPhase('idle');
      }
    },
    [startListening],
  );

  const handleParse = useCallback(
    async (utterance: string) => {
      setPhase('parsing');
      try {
        const res = await fetch('/api/parse/review-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            utterance,
            cardName,
            current: currentRef.current,
            contextDate: todayIsoDate(),
          }),
        });
        const json = (await res.json()) as ParseResult | { error: string };
        if (!res.ok || 'error' in json) {
          throw new Error('error' in json ? json.error : `parse ${res.status}`);
        }
        const result = json;

        if (result.kind === 'update' && result.field && result.newValue != null) {
          unclearCountRef.current = 0;
          const value: string | number =
            result.field === 'bonusTarget' ? Number(result.newValue) : result.newValue;
          onUpdateRef.current(result.field, value);
          await speakAndContinue(result.spokenResponse, true);
        } else if (result.kind === 'save') {
          unclearCountRef.current = 0;
          await speakAndContinue(result.spokenResponse, false);
          onSaveRef.current();
        } else if (result.kind === 'cancel') {
          unclearCountRef.current = 0;
          await speakAndContinue(result.spokenResponse, false);
        } else {
          // 'unclear' — give one ask-back, then exit silently on the second.
          unclearCountRef.current += 1;
          if (unclearCountRef.current >= 2) {
            setPhase('idle');
            setTranscript('');
            unclearCountRef.current = 0;
          } else {
            await speakAndContinue(result.spokenResponse, true);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setPhase('idle');
      }
    },
    [cardName, speakAndContinue],
  );

  const start = useCallback(async () => {
    setError(null);
    setTranscript('');
    unclearCountRef.current = 0;
    setPhase('greeting');
    try {
      await speak('Which field needs changing? Or say save if all good.');
    } catch {
      /* TTS failure shouldn't block listening */
    }
    startListening();
  }, [startListening]);

  if (!supported) return null;

  const active = phase !== 'idle';

  return (
    <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      {!active ? (
        <button
          type="button"
          onClick={() => void start()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-ph-red)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
        >
          <Mic className="h-4 w-4" aria-hidden />
          Tap to edit by voice
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={stop}
            aria-label="Stop voice editing"
            className={clsx(
              'grid h-14 w-14 place-items-center rounded-full text-white shadow-md transition-all active:scale-95',
              (phase === 'listening' || phase === 'greeting' || phase === 'speaking') &&
                'animate-pulse',
              phase === 'listening'
                ? 'bg-[var(--color-ph-red)] ring-4 ring-[var(--color-ph-red)]/30'
                : phase === 'speaking' || phase === 'greeting'
                  ? 'bg-emerald-500'
                  : 'bg-zinc-400',
            )}
          >
            {phase === 'speaking' || phase === 'greeting' ? (
              <Volume2 className="h-5 w-5" aria-hidden />
            ) : phase === 'listening' ? (
              <MicOff className="h-5 w-5" aria-hidden />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            )}
          </button>
          <p className="text-center text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {phase === 'greeting'
              ? 'Speaking…'
              : phase === 'listening'
                ? 'Listening — tap to stop'
                : phase === 'parsing'
                  ? 'Thinking…'
                  : phase === 'speaking'
                    ? 'Confirming…'
                    : ''}
          </p>
          {transcript.length > 0 && (
            <p className="text-center text-[11px] italic text-zinc-500">
              &ldquo;{transcript}&rdquo;
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-center text-[11px] text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
      {!active && (
        <p className="mt-2 text-center text-[10px] text-zinc-500">
          Try: &ldquo;approval is 5 June&rdquo; · &ldquo;min spend is 3000&rdquo; ·
          &ldquo;save&rdquo;
        </p>
      )}
    </div>
  );
}
