'use client';

// Reusable voice-or-text input. Tap the mic to dictate, or just type in the
// field. Used by Update Spend, Update Benefits, Ask Copilot, and the
// post-OCR conversational onboarding.
//
// Streaming behaviour: interim transcripts update the visible text live;
// the final transcript fires `onSubmit` when the user taps "Send" (or hits
// Enter). The component does NOT auto-submit on end-of-speech — the user
// confirms, so a misheard phrase can be corrected in place.

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, AlertCircle, Volume2, Loader2 } from 'lucide-react';
import {
  getSpeechRecognitionCtor,
  isSpeechRecognitionAvailable,
  type SpeechRecognitionInstance,
} from '@/lib/speech';
import { cancelSpeech, speak } from '@/lib/tts';
import { createVoiceRecorder, isRecordingSupported, type VoiceRecorder } from '@/lib/voice-record';

export interface VoiceInputProps {
  placeholder?: string;
  ariaLabel: string;
  initialValue?: string;
  onSubmit: (text: string) => void;
  disabled?: boolean;
  /** Optional: render an extra hint below the input (e.g. examples). */
  hint?: React.ReactNode;
  /** Optional autoFocus the text input on mount. */
  autoFocus?: boolean;
  /**
   * Optional spoken prompt played the FIRST time the user taps the mic on
   * this instance — gives the app a voice-led "go ahead" before listening
   * starts. Subsequent taps skip the greeting so it doesn't feel naggy.
   */
  micGreeting?: string;
}

type Status = 'idle' | 'greeting' | 'listening' | 'recording' | 'transcribing' | 'error';

/**
 * Decide which voice-input path to use in this browser.
 *
 * Prefer SpeechRecognition unconditionally — including on iOS — because
 * SR gives live interim transcripts (words appear as you speak) which is
 * what users actually want. The other voice surfaces in this app (the
 * global mic on Tab 3, the Add Card review walkthrough) use SR directly
 * and work fine on iOS PWAs, so the previous iOS→MediaRecorder detour
 * here was overcautious.
 *
 * MediaRecorder remains as a last-resort fallback only when SR is
 * genuinely unavailable (no constructor at all — e.g. headless test
 * environments or very old browsers).
 */
function pickVoicePath(): 'sr' | 'record' | 'none' {
  if (typeof window === 'undefined') return 'none';
  if (isSpeechRecognitionAvailable()) return 'sr';
  if (isRecordingSupported()) return 'record';
  return 'none';
}

export function VoiceInput({
  placeholder,
  ariaLabel,
  initialValue = '',
  onSubmit,
  disabled,
  hint,
  autoFocus,
  micGreeting,
}: VoiceInputProps) {
  const [text, setText] = useState(initialValue);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Live mic volume 0..1, driven by the recorder's VAD. Powers the
  // pulsing level dots while recording so iOS users get feedback the
  // mic is hearing them (since MediaRecorder gives no live transcript).
  const [micLevel, setMicLevel] = useState(0);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const hasGreeted = useRef(false);
  // True when the user actively cancelled a voice session — used to
  // suppress the auto-submit that otherwise fires on speech end.
  const cancelledRef = useRef(false);
  // Decide path once per mount. iOS gets MediaRecorder; everyone else
  // gets browser SpeechRecognition where available.
  const voicePath = useRef<'sr' | 'record' | 'none'>('none');
  if (voicePath.current === 'none' && typeof window !== 'undefined') {
    voicePath.current = pickVoicePath();
  }
  const supported = voicePath.current !== 'none';

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      try {
        recorderRef.current?.cancel();
      } catch {
        /* ignore */
      }
      // Deliberately NOT calling cancelSpeech() here. In React 19 StrictMode
      // dev, every mount runs an extra unmount→mount cycle, and this cleanup
      // would abort any in-flight TTS started by the parent screen's mount
      // greeting — user hears nothing. The next speak() call cancels prior
      // audio anyway via lib/tts.ts cancelSpeech-on-entry.
    };
  }, []);

  async function startListening() {
    if (micGreeting && !hasGreeted.current) {
      hasGreeted.current = true;
      setStatus('greeting');
      setErrorMessage(null);
      try {
        await speak(micGreeting);
      } catch {
        /* don't block recognition if TTS fails */
      }
    }
    if (voicePath.current === 'record') {
      void beginRecording();
    } else {
      beginRecognition();
    }
  }

  // Stops the active recorder, sends the audio blob to /api/transcribe,
  // and drops the returned text into the input. Used on iOS PWAs where
  // browser SpeechRecognition doesn't work.
  //
  // VAD + level meter: the recorder fires onLevel during recording (we
  // mirror to micLevel state for the UI's pulsing dots) and fires
  // onAutoStop once the user has been silent for ~1.2s after speaking.
  // The auto-stop triggers stopRecordingAndTranscribe, which gives the
  // user a "speak naturally, stop naturally" experience without needing
  // to tap mic twice.
  async function beginRecording() {
    try {
      const rec = await createVoiceRecorder({
        onLevel: (level) => setMicLevel(level),
        onAutoStop: () => {
          // Recorder detected silence. Finish + transcribe + auto-submit.
          // Guard against double-fire if the user manually tapped stop
          // at roughly the same moment.
          if (recorderRef.current === rec) {
            void stopRecordingAndTranscribe();
          }
        },
      });
      recorderRef.current = rec;
      rec.start();
      setStatus('recording');
      setErrorMessage(null);
      setMicLevel(0);
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Allow access in Settings → PH Copilot.'
          : err instanceof Error
            ? err.message
            : String(err),
      );
    }
  }

  async function stopRecordingAndTranscribe() {
    const rec = recorderRef.current;
    if (!rec) {
      setStatus('idle');
      return;
    }
    setStatus('transcribing');
    try {
      const blob = await rec.stop();
      recorderRef.current = null;

      const form = new FormData();
      form.append('audio', blob, 'recording');

      const res = await fetch('/api/transcribe', { method: 'POST', body: form });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !json.text) {
        throw new Error(json.error ?? `transcribe ${res.status}`);
      }

      // Voice path = clear commitment to submit. Auto-fire the same
      // submit the Send button would, so the user doesn't need a
      // second tap. Replaces (rather than appending to) any typed
      // text — the user who tapped mic was dictating fresh.
      const transcribed = json.text.trim();
      setStatus('idle');
      if (transcribed) submitValue(transcribed);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  function beginRecognition() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus('error');
      setErrorMessage('Voice input isn’t supported in this browser. Type instead.');
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.lang = 'en-AU';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      let finalText = '';
      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result) continue;
          const alt = result[0];
          if (!alt) continue;
          if (result.isFinal) finalText += alt.transcript;
          else interim += alt.transcript;
        }
        setText((finalText + interim).trim());
      };
      recognition.onerror = (event) => {
        setStatus('error');
        const code = event.error ?? 'unknown';
        setErrorMessage(
          code === 'not-allowed'
            ? 'Microphone permission denied. Tap the lock icon in the address bar to allow.'
            : `Voice input error: ${code}`,
        );
      };
      recognition.onend = () => {
        const wasCancelled = cancelledRef.current;
        cancelledRef.current = false;
        setStatus((s) => (s === 'listening' ? 'idle' : s));
        // Auto-submit on natural speech end (user finished talking OR
        // explicitly tapped Stop). Suppress when cancelInteraction set
        // the cancel flag.
        const trimmed = finalText.trim();
        if (!wasCancelled && trimmed) submitValue(trimmed);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setStatus('listening');
      setErrorMessage(null);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setStatus('idle');
  }

  function cancelInteraction() {
    cancelledRef.current = true;
    cancelSpeech();
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    try {
      recorderRef.current?.cancel();
    } catch {
      /* ignore */
    }
    recorderRef.current = null;
    setStatus('idle');
  }

  // Mic button click dispatcher. Behavior depends on current status +
  // which voice path we're using (SR vs MediaRecorder).
  function handleMicClick() {
    if (status === 'greeting') {
      cancelInteraction();
      return;
    }
    if (status === 'listening') {
      stopListening();
      return;
    }
    if (status === 'recording') {
      // User tapped to finish recording — stop + transcribe.
      void stopRecordingAndTranscribe();
      return;
    }
    if (status === 'transcribing') {
      // Mid-transcription tap = cancel (we can't actually abort the
      // in-flight request mid-fetch; just reset state).
      setStatus('idle');
      return;
    }
    void startListening();
  }

  // Submit an explicit value — used by both the Send button (trySubmit
  // reads current `text`) and the voice paths (which pass the freshly-
  // transcribed string directly to avoid stale-closure issues with
  // setState batching).
  function submitValue(value: string) {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText('');
  }

  function trySubmit() {
    submitValue(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Capture Enter ourselves and prevent any parent form from submitting —
    // VoiceInput is intentionally NOT wrapped in <form>, because callers
    // sometimes embed it inside another form (e.g. the Add Card review),
    // and nested forms are invalid HTML.
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      trySubmit();
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 rounded-2xl border border-ph-border-strong bg-ph-card px-2 py-1.5 focus-within:ring-2 focus-within:ring-ph-brick dark:border-ph-border-strong dark:bg-ph-card">
        {supported && (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={disabled || status === 'transcribing'}
            aria-label={
              status === 'greeting'
                ? 'Speaking — tap to skip'
                : status === 'listening'
                  ? 'Stop voice input'
                  : status === 'recording'
                    ? 'Stop recording and transcribe'
                    : status === 'transcribing'
                      ? 'Transcribing…'
                      : 'Start voice input'
            }
            aria-pressed={status === 'listening' || status === 'greeting' || status === 'recording'}
            className={`grid h-9 w-9 flex-none place-items-center rounded-full transition-colors ${
              status === 'listening' || status === 'greeting' || status === 'recording'
                ? 'animate-pulse bg-ph-red text-white'
                : status === 'transcribing'
                  ? 'bg-ph-fill text-ph-text-meta dark:bg-ph-fill-warm'
                  : 'text-ph-text-muted hover:bg-ph-fill-warm dark:text-ph-text-muted dark:hover:bg-ph-fill-warm'
            }`}
          >
            {status === 'greeting' ? (
              <Volume2 className="h-4 w-4" aria-hidden />
            ) : status === 'listening' || status === 'recording' ? (
              <MicOff className="h-4 w-4" aria-hidden />
            ) : status === 'transcribing' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Mic className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          disabled={disabled}
          autoFocus={autoFocus}
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none"
        />
        <button
          type="button"
          onClick={trySubmit}
          disabled={!text.trim() || disabled}
          aria-label="Send"
          className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ph-red text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {!supported && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-ph-text-meta">
          <AlertCircle className="mt-0.5 h-3 w-3 flex-none" aria-hidden />
          Voice input isn’t supported in this browser. Type instead.
        </p>
      )}
      {status === 'recording' && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-ph-text-meta">
          <LevelMeter level={micLevel} />
          <span>Listening… stop speaking and I&apos;ll wrap up.</span>
        </div>
      )}
      {status === 'transcribing' && (
        <p className="mt-2 text-[11px] text-ph-text-meta">Transcribing…</p>
      )}
      {errorMessage && (
        <p
          role="alert"
          className="mt-2 flex items-start gap-1.5 rounded-lg bg-ph-negative-chip px-2 py-1.5 text-[11px] text-ph-ink dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-3 w-3 flex-none" aria-hidden />
          {errorMessage}
        </p>
      )}
      {hint && <div className="mt-2 text-[11px] text-ph-text-meta">{hint}</div>}
    </div>
  );
}

/**
 * Five-dot equalizer-style level meter. Each dot grows + brightens
 * based on the current RMS volume. Pure visual signal that the mic is
 * hearing the user — critical UX patch on iOS where MediaRecorder
 * can't show live transcripts.
 */
function LevelMeter({ level }: { level: number }) {
  // Sensitivity knob. Real-world speech RMS hovers 0.05–0.3; multiplier
  // expands that to a 0..1 scale that drives visual fullness.
  const scaled = Math.min(1, level * 4);
  // Each dot lights up at a different threshold so the meter reads as
  // a rising waveform, not a single brightness change.
  const thresholds = [0.05, 0.2, 0.4, 0.6, 0.8];
  return (
    <span className="inline-flex h-3 items-end gap-0.5" aria-hidden>
      {thresholds.map((t, i) => {
        const active = scaled >= t;
        const height = active ? Math.min(12, 4 + (scaled - t) * 16) : 3;
        return (
          <span
            key={i}
            className={`w-0.5 rounded-full transition-all duration-75 ${active ? 'bg-ph-red' : 'bg-zinc-300 dark:bg-ph-fill'}`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </span>
  );
}
