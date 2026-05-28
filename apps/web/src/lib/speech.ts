// Thin wrapper around the Web Speech API (SpeechRecognition + SpeechSynthesis).
//
// Why Web Speech API and not Whisper: free, in-browser, instant setup, no
// extra API key. Works in Chrome/Edge/Safari today. Firefox has no support —
// callers should check isSpeechRecognitionAvailable() and render a fallback.
//
// The dom lib only exposes `SpeechRecognitionEvent` as a global; the
// `SpeechRecognition` constructor + instance type live behind vendor prefixes
// and aren't standardised in lib.dom. We declare a minimal shape here.

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResultEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
}

export type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionAvailable(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Speak the given text using the browser's TTS engine (en-AU when available). */
export function speak(text: string): void {
  if (!isSpeechSynthesisAvailable() || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-AU';
  utterance.rate = 1;
  utterance.pitch = 1;
  // Cancel any in-flight utterance so chained outputs don't overlap.
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
