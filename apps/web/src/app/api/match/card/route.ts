// POST /api/match/card
// Body:   { utterance }
// Output: { cardId | null, confidence }
//
// Match a spoken or typed card name (e.g. "amex platinum", "the westpac
// altitude qantas black") against the bundled catalogue. Reuses the same
// matchCardFromOcr heuristic — but exposes it via an API so the unified
// add-card conversation can call it from a Client Component.

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCardsWithIssuer } from '@ph/shared';
import { matchCardFromOcr } from '@/lib/match-card';

const REQUEST_SCHEMA = z.object({
  utterance: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const parsed = REQUEST_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const match = matchCardFromOcr(
    { productName: parsed.data.utterance, issuer: parsed.data.utterance },
    getCardsWithIssuer(),
  );

  if (!match) {
    return NextResponse.json({ cardId: null, confidence: 'low' });
  }

  const confidence: 'high' | 'medium' | 'low' =
    match.score >= 6 ? 'high' : match.score >= 3 ? 'medium' : 'low';

  return NextResponse.json({ cardId: match.cardId, confidence });
}
