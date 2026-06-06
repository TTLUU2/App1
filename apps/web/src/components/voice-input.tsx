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
 * iOS gets the MediaRecorder path even when `webkitSpeechRecognition`
 * exists, because the constructor is present but the actual recognition
 * never completes (a well-known iOS Safari + WKWebView quirk). On iOS
 * PWAs this is the difference between "tap mic, nothing happens" and
 * "tap mic, get transcribed text back".
 */
function pickVoicePath(): 'sr' | 'record' | 'none' {
  if (typeof window === 'undefined') return 'none';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (isIOS && isRecordingSupported()) return 'record';
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
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const hasGreeted = useRef(false);
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
  async function beginRecording() {
    try {
      const rec = await createVoiceRecorder();
      recorderRef.current = rec;
      rec.start();
      setStatus('recording');
      setErrorMessage(null);
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

      // Append rather than replace — lets the user record multiple
      // takes or combine with typed text already in the field.
      setText((prev) => (prev ? `${prev} ${json.text}`.trim() : json.text!.trim()));
      setStatus('idle');
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
        setStatus((s) => (s === 'listening' ? 'idle' : s));
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

  function trySubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText('');
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
      <div className="flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-[var(--color-ph-red)] dark:border-zinc-700 dark:bg-zinc-900">
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
                ? 'animate-pulse bg-[var(--color-ph-red)] text-white'
                : status === 'transcribing'
                  ? 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
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
          className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--color-ph-red)] text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {!supported && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-zinc-500">
          <AlertCircle className="mt-0.5 h-3 w-3 flex-none" aria-hidden />
          Voice input isn’t supported in this browser. Type instead.
        </p>
      )}
      {status === 'recording' && (
        <p className="mt-2 text-[11px] text-zinc-500">Listening… tap mic again to finish.</p>
      )}
      {status === 'transcribing' && <p className="mt-2 text-[11px] text-zinc-500">Transcribing…</p>}
      {errorMessage && (
        <p
          role="alert"
          className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-3 w-3 flex-none" aria-hidden />
          {errorMessage}
        </p>
      )}
      {hint && <div className="mt-2 text-[11px] text-zinc-500">{hint}</div>}
    </div>
  );
}
