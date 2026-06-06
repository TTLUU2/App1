'use client';

// MediaRecorder wrapper used by VoiceInput's iOS fallback path. When
// the browser's webkitSpeechRecognition isn't usable (every iOS browser
// today + WKWebView-hosted PWAs), we record audio here, send it to
// /api/transcribe, and drop the returned text into the same input.
//
// API:
//   const rec = await createVoiceRecorder();
//   rec.start();
//   ...
//   const blob = await rec.stop();   // releases mic + returns audio blob
//
// Codec preference: opus/webm on Chrome/Firefox (small, well-supported
// by Scribe), mp4/aac on Safari (only option iOS gives us). The browser
// picks the first available mimeType — we just feed candidates in
// quality order.

export interface VoiceRecorder {
  start: () => void;
  stop: () => Promise<Blob>;
  cancel: () => void;
}

export interface VoiceRecorderOptions {
  /** Called ~20 times/sec with the current mic volume as 0..1. Lets the
   *  UI show a pulsing level meter so the user knows the mic is hearing
   *  them — closes the "is this working?" gap on iOS PWA where there's
   *  no live transcript. */
  onLevel?: (level: number) => void;
  /** Called ONCE when the mic has been below `silenceThreshold` (default
   *  0.02 RMS, scale 0..1) for `silenceMs` (default 1200ms) AFTER at
   *  least one period of voice detected. Lets the UI auto-stop when the
   *  user has clearly finished speaking. */
  onAutoStop?: () => void;
  silenceThreshold?: number;
  silenceMs?: number;
}

const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const t of PREFERRED_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

export async function createVoiceRecorder(
  options: VoiceRecorderOptions = {},
): Promise<VoiceRecorder> {
  if (!isRecordingSupported()) {
    throw new Error('MediaRecorder + getUserMedia not supported in this browser');
  }

  const { onLevel, onAutoStop, silenceThreshold = 0.02, silenceMs = 1200 } = options;

  // Request mic permission and the audio stream. On iOS this triggers
  // the system permission prompt the first time and is sticky after
  // the user grants it.
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const mimeType = pickMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

  const chunks: BlobPart[] = [];
  recorder.addEventListener('dataavailable', (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  });

  // --- Audio level analysis (Web Audio API) ---
  // Connects an AnalyserNode to the same mic stream so we can poll
  // volume without re-grabbing the mic. Used for the live level meter
  // and silence-based auto-stop. Cleanly torn down by releaseStream.
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let pollHandle: number | null = null;
  let autoStopFired = false;
  let lastVoiceAt = 0;
  let sawVoice = false;
  const POLL_MS = 50; // ~20 Hz, smooth for UI

  function startAnalysis() {
    if (!onLevel && !onAutoStop) return;
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctx();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const buf = new Uint8Array(analyser.fftSize);
      lastVoiceAt = performance.now();

      const tick = () => {
        if (!analyser || stopped) return;
        analyser.getByteTimeDomainData(buf);
        // Compute RMS of the centred (signed) signal. Bytes are 0..255
        // centred at 128 for silence; subtract 128 and normalise to ~0..1.
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i]! - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / buf.length);

        onLevel?.(rms);

        // Track voice / silence transitions for auto-stop.
        if (rms >= silenceThreshold) {
          sawVoice = true;
          lastVoiceAt = performance.now();
        } else if (sawVoice && !autoStopFired) {
          const silenceFor = performance.now() - lastVoiceAt;
          if (silenceFor >= silenceMs) {
            autoStopFired = true;
            onAutoStop?.();
            return; // stop polling — caller will call .stop()
          }
        }

        pollHandle = window.setTimeout(tick, POLL_MS);
      };
      tick();
    } catch {
      // Web Audio unavailable for some reason — recording still works,
      // we just don't get the level meter or auto-stop.
    }
  }

  // Stop the underlying stream tracks when recording ends — without
  // this iOS keeps the mic indicator on after the user thinks they're
  // done. Also tears down the AudioContext + poll timer.
  function releaseStream() {
    if (pollHandle != null) {
      window.clearTimeout(pollHandle);
      pollHandle = null;
    }
    if (audioCtx) {
      audioCtx.close().catch(() => undefined);
      audioCtx = null;
      analyser = null;
    }
    for (const track of stream.getTracks()) track.stop();
  }

  let stopped = false;

  return {
    start() {
      // 250ms timeslice — gets us periodic dataavailable events so a
      // long recording doesn't fire one giant blob at the end.
      recorder.start(250);
      startAnalysis();
    },
    stop() {
      return new Promise<Blob>((resolve, reject) => {
        if (stopped) {
          reject(new Error('recorder already stopped'));
          return;
        }
        stopped = true;
        recorder.addEventListener('stop', () => {
          releaseStream();
          resolve(new Blob(chunks, { type: mimeType ?? 'audio/webm' }));
        });
        recorder.addEventListener('error', (e) => {
          releaseStream();
          reject(e);
        });
        try {
          recorder.stop();
        } catch (err) {
          releaseStream();
          reject(err);
        }
      });
    },
    cancel() {
      stopped = true;
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
      releaseStream();
    },
  };
}
