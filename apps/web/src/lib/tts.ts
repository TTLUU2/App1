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

// Airport / city codes the TTS otherwise spells out letter-by-letter
// ("S-Y-D" instead of "Sydney"). UI text keeps the codes (compact, scan-
// friendly); we expand only the audio path. Add codes here as Copilot /
// sweet-spots data introduces them. Match is word-boundary-only so we
// don't replace inside "syd-mel" hyphenated tokens (those get split too).
const AIRPORT_PRONUNCIATIONS: Record<string, string> = {
  // Australia
  SYD: 'Sydney',
  MEL: 'Melbourne',
  BNE: 'Brisbane',
  PER: 'Perth',
  ADL: 'Adelaide',
  CBR: 'Canberra',
  HBA: 'Hobart',
  CNS: 'Cairns',
  OOL: 'Gold Coast',
  // Asia
  HND: 'Tokyo Haneda',
  NRT: 'Tokyo Narita',
  KIX: 'Osaka',
  HKG: 'Hong Kong',
  SIN: 'Singapore',
  ICN: 'Seoul',
  PEK: 'Beijing',
  PVG: 'Shanghai',
  TPE: 'Taipei',
  BKK: 'Bangkok',
  KUL: 'Kuala Lumpur',
  DPS: 'Bali',
  // Europe
  LHR: 'London Heathrow',
  LGW: 'London Gatwick',
  CDG: 'Paris Charles de Gaulle',
  FRA: 'Frankfurt',
  AMS: 'Amsterdam',
  FCO: 'Rome',
  ZRH: 'Zurich',
  // Americas
  LAX: 'Los Angeles',
  SFO: 'San Francisco',
  JFK: 'New York J F K',
  ORD: 'Chicago',
  DFW: 'Dallas',
  YVR: 'Vancouver',
  YYZ: 'Toronto',
  // Middle East / Africa
  DXB: 'Dubai',
  DOH: 'Doha',
  AUH: 'Abu Dhabi',
  JNB: 'Johannesburg',
  // Oceania
  AKL: 'Auckland',
  WLG: 'Wellington',
  CHC: 'Christchurch',
  NAN: 'Nadi',
  NOU: 'Noumea',
};

// Pre-built regex covering every code as a word-with-boundary match.
// `\b` doesn't fire on hyphens in JS regex (it sees - as a non-word), so
// "SYD-MEL" matches both halves naturally.
const AIRPORT_CODE_RE = new RegExp(
  '\\b(' + Object.keys(AIRPORT_PRONUNCIATIONS).join('|') + ')\\b',
  'g',
);

/**
 * Expand 3-letter airport / city codes to spoken names. Used by the TTS
 * path so "SYD to HND" speaks as "Sydney to Tokyo Haneda" instead of
 * "S-Y-D to H-N-D". UI display strings are not affected.
 */
export function expandAirportCodes(text: string): string {
  return text.replace(AIRPORT_CODE_RE, (code) => AIRPORT_PRONUNCIATIONS[code] ?? code);
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
  // Respect the global voice-output toggle. Read directly from
  // localStorage rather than the Zustand store so lib functions don't
  // need React context. The store writes the same JSON blob.
  if (!isVoiceOutputEnabled()) return;
  cancelSpeech();

  // Expand 3-letter airport codes so the audio path says "Sydney" not
  // "S-Y-D". UI strings stay compact. Done before the native fallback
  // branch so both paths benefit.
  const spokenText = expandAirportCodes(text);

  if (opts.forceNative) {
    speakNative(spokenText);
    return;
  }

  try {
    const ctrl = new AbortController();
    currentCtrl = ctrl;

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: spokenText, voiceId: opts.voiceId }),
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
    if (isSpeechSynthesisAvailable()) speakNative(spokenText);
  }
}

/** True when at least one voice-output path is available in this browser. */
export function isSpeechAvailable(): boolean {
  // The ElevenLabs path needs a fetch-capable browser, which is universal.
  // The fallback needs SpeechSynthesis. Either covers us, so default true
  // outside the server. Real failures degrade silently.
  return typeof window !== 'undefined';
}

// Read the persisted voice-output preference without taking a React
// dependency. The user-preferences store writes to this same key; we
// just decode the JSON. Default = ON when no prefs file exists.
function isVoiceOutputEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem('ph-user-preferences-v1');
    if (!raw) return true;
    const parsed = JSON.parse(raw) as {
      preferences?: { voiceOutputEnabled?: boolean };
    };
    return parsed?.preferences?.voiceOutputEnabled !== false;
  } catch {
    return true;
  }
}
