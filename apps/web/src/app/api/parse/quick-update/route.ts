// POST /api/parse/quick-update
// Body:   { utterance, heldCards: [...], benefits: [...] }
// Output: discriminated union — spend | benefit | unknown
//
// Used by the Tab 3 "Quick update" voice bar. The user can say either a
// spend phrase ("add 250 to amex") or a benefit phrase ("used my hotel
// credit"); Claude picks which kind the user meant and returns the
// corresponding fields, so the client applies the right mutation without
// asking the user to pick a category first.

import { type NextRequest, NextResponse } from 'next/server';
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
  kind: z
    .enum(['spend', 'benefit', 'question', 'unknown'])
    .describe(
      'spend = the user is logging a transaction amount against a card ("add 250 to amex"). ' +
        'benefit = the user used / redeemed a card benefit ("used my hotel credit"). ' +
        'question = the user is asking the Copilot anything about their cards, eligibility, ' +
        'fees, benefits, or strategy ("when does my westpac fee hit?", "should I cancel my amex?", ' +
        'how many points have I earned?"). ' +
        'unknown = truly ambiguous, off-topic, or unparseable.',
    ),
  amount: z
    .number()
    .nullable()
    .describe(
      'For spend: dollar amount in AUD. Plain ("250"), dollar ("$250"), spoken ("two fifty", "four thirty", "twelve hundred"), decimal ("1,234.56"). Null for non-spend or if unparseable.',
    ),
  spendCardId: z
    .string()
    .nullable()
    .describe(
      'For spend: id of the held card the spend goes against. Match by name fragments / issuer / nickname / last4. Null if no card matches or ambiguous.',
    ),
  benefitUserCardId: z
    .string()
    .nullable()
    .describe('For benefit: userCardId of the card the benefit belongs to. Null otherwise.'),
  benefitId: z
    .string()
    .nullable()
    .describe('For benefit: id of the specific benefit redeemed. Null otherwise.'),
  confidence: z.enum(['high', 'medium', 'low']),
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return missingKeyResponse('/api/parse/quick-update');

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
        'You parse short spoken/typed phrases from the Card Optimisation dashboard. ' +
        'The user could be: ' +
        '(1) LOGGING A SPEND — "add 250 to amex plat" → kind=spend, fill amount + spendCardId. ' +
        '(2) MARKING A BENEFIT USED — "used my hotel credit" → kind=benefit, fill benefit fields. ' +
        '(3) ASKING A QUESTION — "when does my westpac fee hit?", "should I cancel my amex?", ' +
        '"what should my next card be?", "how am I tracking on min spend?" → kind=question, all ' +
        'spend/benefit fields null (the client will pass the original utterance to Copilot). ' +
        'Prefer "question" over "unknown" whenever the utterance is interrogative or seeking ' +
        'advice/info, even if it mentions cards by name. Only use "unknown" for genuinely ' +
        'off-topic or garbled input.',
      userText: `Held cards:\n${heldList}\n\nBenefits on held cards:\n${benefitList}\n\nUtterance: ${parsed.data.utterance}`,
    });
    return NextResponse.json(output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[parse/quick-update] generateText failed:', msg);
    return NextResponse.json({ error: 'parse failed', detail: msg }, { status: 502 });
  }
}
