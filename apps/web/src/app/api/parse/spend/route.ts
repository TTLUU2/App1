// POST /api/parse/spend
// Body:   { utterance: string, heldCards: [{ id, name, nickname? }] }
// Output: { amount: number|null, cardId: string|null, confidence: 'high'|'medium'|'low' }
//
// Uses Claude to parse free-form phrases like "Add 250 to the Amex Plat" or
// "I spent four-thirty on my Velocity card today". Returns nulls when the
// model can't determine the field — caller then renders a disambiguation UI.

import { type NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateStructuredObject, missingKeyResponse } from '@/lib/ai-client';

const REQUEST_SCHEMA = z.object({
  utterance: z.string().min(1).max(500),
  heldCards: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        nickname: z.string().nullable().optional(),
        last4: z.string().nullable().optional(),
      }),
    )
    .max(50),
});

const PARSE_SCHEMA = z.object({
  amount: z
    .number()
    .nullable()
    .describe(
      'The dollar amount the user is reporting they spent, in AUD. Supports plain ("250"), dollar ("$250"), spoken ("two fifty" = 250, "four thirty" = 430, "twelve hundred" = 1200), and decimal ("1,234.56") forms. Null if no amount is identifiable.',
    ),
  cardId: z
    .string()
    .nullable()
    .describe(
      'The id of the held card the user is referring to. Match against the heldCards list provided — by name fragments, issuer fragments, nicknames, or last4. Null if no card matches or if multiple cards match ambiguously.',
    ),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .describe(
      'high = both amount and cardId unambiguous; medium = one is a guess; low = significant guesswork or ambiguity.',
    ),
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return missingKeyResponse('/api/parse/spend');

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

  const heldList = parsed.data.heldCards
    .map(
      (c) =>
        `- ${c.id}: "${c.name}"${c.nickname ? ` aka "${c.nickname}"` : ''}${c.last4 ? ` (•••• ${c.last4})` : ''}`,
    )
    .join('\n');

  try {
    const output = await generateStructuredObject({
      schema: PARSE_SCHEMA,
      instructions:
        "You parse short spoken/typed phrases that report a credit-card spend. Extract the dollar amount and which of the user's held cards they mean. Return null for either field if uncertain. The user is in Australia (en-AU). Be conservative with cardId when multiple cards could plausibly match.",
      userText: `Held cards:\n${heldList}\n\nUtterance: ${parsed.data.utterance}`,
    });
    return NextResponse.json(output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[parse/spend] generateText failed:', msg);
    return NextResponse.json({ error: 'parse failed', detail: msg }, { status: 502 });
  }
}
