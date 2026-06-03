// ElevenLabs TTS proxy. Streams audio from ElevenLabs back to the browser so
// the API key never reaches the client. When the key isn't configured the
// route 503s and the client-side lib/tts.ts falls back to the browser's
// native SpeechSynthesis — speech still works locally, just lower quality.

import { NextResponse, type NextRequest } from 'next/server';

// Default voice: Rachel — calm, neutral, broadly liked. Override per-call
// with body.voiceId or globally with the ELEVENLABS_VOICE_ID env var.
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

// Turbo v2.5 trades a small quality drop for ~300ms TTFB — right call for
// in-app prompts where latency is felt more than fidelity.
const MODEL_ID = 'eleven_turbo_v2_5';

const MAX_TEXT_LEN = 1000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 503 });
  }

  let body: { text?: unknown; voiceId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    return NextResponse.json({ error: `text exceeds ${MAX_TEXT_LEN} chars` }, { status: 400 });
  }

  const voiceId =
    (typeof body.voiceId === 'string' && body.voiceId.trim()) ||
    process.env.ELEVENLABS_VOICE_ID ||
    DEFAULT_VOICE_ID;

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return NextResponse.json(
      { error: `ElevenLabs ${upstream.status}`, detail: detail.slice(0, 200) },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
}
