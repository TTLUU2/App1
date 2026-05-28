// POST /api/parse/benefit
// Body:   { utterance, benefits: [{ userCardId, benefitId, cardName, benefitName }] }
// Output: { userCardId|null, benefitId|null, confidence }

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateStructuredObject, missingKeyResponse } from '@/lib/ai-client';

const REQUEST_SCHEMA = z.object({
  utterance: z.string().min(1).max(500),
  benefits: z
    .array(
      z.object({
        userCardId: z.string(),
        benefitId: z.string(),
        cardName: z.string(),
        benefitName: z.string(),
      }),
    )
    .max(100),
});

const PARSE_SCHEMA = z.object({
  userCardId: z
    .string()
    .nullable()
    .describe('id of the held card the user refers to. Null if uncertain.'),
  benefitId: z
    .string()
    .nullable()
    .describe(
      'id of the specific benefit the user redeemed. Match against the benefits list provided — by benefit name fragments + card name fragments. Null if no benefit matches or multiple match ambiguously.',
    ),
  confidence: z.enum(['high', 'medium', 'low']),
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return missingKeyResponse('/api/parse/benefit');

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

  const benefitList = parsed.data.benefits
    .map(
      (b) =>
        `- userCardId=${b.userCardId} benefitId=${b.benefitId}: "${b.benefitName}" on ${b.cardName}`,
    )
    .join('\n');

  try {
    const output = await generateStructuredObject({
      schema: PARSE_SCHEMA,
      instructions:
        'You parse short spoken/typed phrases like "Used my Amex hotel credit" or "Burned my $400 travel credit on the Plat". Map to one specific benefit on one specific held card from the list. Return null fields when uncertain.',
      userText: `Benefits:\n${benefitList}\n\nUtterance: ${parsed.data.utterance}`,
    });
    return NextResponse.json(output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[parse/benefit] generateText failed:', msg);
    return NextResponse.json({ error: 'parse failed', detail: msg }, { status: 502 });
  }
}
