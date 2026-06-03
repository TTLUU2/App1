'use client';

// Voice output abstraction. Prefers ElevenLabs (via /api/tts) for natural
// speech; falls back to the browser's native SpeechSynthesis whenever the
// API errors or no key is configured server-side. Calling speak() again
// cancels any in-flight utterance so chained prompts don't overlap.

import { isSpeechSynthesisAvailable, speak as speakNative } from '@/lib/speech';

let currentAudio: HTMLAudioElement | null = null;
let currentCtrl: AbortController | null = null;

export interface SpeakOptions {
  /** Force the browser's native TTS even when ElevenLabs is available. */
  forceNative?: boolean;
  /** Override ElevenLabs voice id (ignored when forceNative). */
  voiceId?: string;
}

export function cancelSpeech(): void {
  currentCtrl?.abort();
  currentCtrl = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (!text) return;
  cancelSpeech();

  if (opts.forceNative) {
    speakNative(text);
    return;
  }

  try {
    const ctrl = new AbortController();
    currentCtrl = ctrl;

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId: opts.voiceId }),
      signal: ctrl.signal,
    });

    if (!res.ok) throw new Error(`tts ${res.status}`);

    const blob = await res.blob();
    if (ctrl.signal.aborted) return;

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    // Resolve when playback *finishes* (or errors), not when it starts —
    // callers like the VoiceInput greeting need to wait for the voice to
    // finish before opening the mic. audio.play() resolves on start, so we
    // chain onto the ended/error events ourselves.
    const playbackDone = new Promise<void>((resolve) => {
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        resolve();
      });
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve();
      });
    });
    await audio.play();
    await playbackDone;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    // Quietly fall back so voice prompts still work without an ElevenLabs
    // key. Browser console will show the network error for diagnostics.
    if (isSpeechSynthesisAvailable()) speakNative(text);
  }
}

/** True when at least one voice-output path is available in this browser. */
export function isSpeechAvailable(): boolean {
  // The ElevenLabs path needs a fetch-capable browser, which is universal.
  // The fallback needs SpeechSynthesis. Either covers us, so default true
  // outside the server. Real failures degrade silently.
  return typeof window !== 'undefined';
}
