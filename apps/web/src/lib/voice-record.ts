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

export async function createVoiceRecorder(): Promise<VoiceRecorder> {
  if (!isRecordingSupported()) {
    throw new Error('MediaRecorder + getUserMedia not supported in this browser');
  }

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

  // Stop the underlying stream tracks when recording ends — without
  // this iOS keeps the mic indicator on after the user thinks they're
  // done.
  function releaseStream() {
    for (const track of stream.getTracks()) track.stop();
  }

  let stopped = false;

  return {
    start() {
      // 250ms timeslice — gets us periodic dataavailable events so a
      // long recording doesn't fire one giant blob at the end.
      recorder.start(250);
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
