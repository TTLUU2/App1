// POST /api/transcribe — speech-to-text proxy using ElevenLabs Scribe.
//
// Why we need this: iOS Safari (and therefore every PWA on iOS, since
// they run inside WKWebView) doesn't reliably support
// `webkitSpeechRecognition`. The web app's voice input collapses to
// "tap mic, nothing happens" on iPhone.
//
// The fallback path: client records audio via MediaRecorder (well-
// supported on iOS Safari 14+), POSTs the blob here as multipart, we
// forward to ElevenLabs Scribe, return the transcribed text. The
// client then drops it into the same `text` state the SpeechRecognition
// path would have set — VoiceInput's downstream pipeline is unchanged.
//
// Latency: ~1.5–3 seconds per utterance depending on length. Slower
// than browser-native SR but functional on iOS where SR is broken.

import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024; // 5MB safety cap
const MODEL_ID = 'scribe_v1';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 503 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json(
      { error: 'expected multipart/form-data with an "audio" field' },
      { status: 400 },
    );
  }

  let formIn: FormData;
  try {
    formIn = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid multipart body' }, { status: 400 });
  }

  const audio = formIn.get('audio');
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: 'missing "audio" file' }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: 'empty audio file' }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: `audio too large (>${MAX_BYTES} bytes)` }, { status: 413 });
  }

  // Build the multipart upload ElevenLabs expects. The Scribe endpoint
  // takes `file` + `model_id` at minimum. Audio mime is inferred from
  // the blob; iOS MediaRecorder emits audio/mp4, Chrome emits webm.
  const formOut = new FormData();
  formOut.append('file', audio, 'recording.bin');
  formOut.append('model_id', MODEL_ID);

  const upstream = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      // Don't set Content-Type — let fetch generate the multipart
      // boundary from the FormData automatically.
    },
    body: formOut,
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return NextResponse.json(
      { error: `ElevenLabs ${upstream.status}`, detail: detail.slice(0, 200) },
      { status: 502 },
    );
  }

  const json = (await upstream.json()) as { text?: string };
  return NextResponse.json({ text: json.text ?? '' });
}
