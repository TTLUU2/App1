// POST /api/onboard/parse
// Body:   { kind: 'date'|'yesno'|'spend_target', answer, today, contextHint? }
// Output: depends on kind (see PARSE_SCHEMAS)
//
// Interprets short conversational answers ("three weeks ago", "yep", "$3000
// in 90 days", "skip") during the post-OCR card onboarding flow (PRD §11.2.1).

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateStructuredObject, missingKeyResponse } from '@/lib/ai-client';

const DATE_OUT = z.object({
  isoDate: z
    .string()
    .nullable()
    .describe(
      'yyyy-MM-dd. Resolve relative phrases ("three weeks ago") using the supplied "today" date.',
    ),
  skip: z.boolean().describe("true if the user said skip / don't know / not sure."),
});

const YESNO_OUT = z.object({
  yes: z.boolean().nullable().describe('true=yes, false=no, null=ambiguous.'),
});

const SPEND_TARGET_OUT = z.object({
  amount: z
    .number()
    .nullable()
    .describe('Target spend in AUD. Supports plain, dollar, spoken, and decimal forms.'),
  deadlineIso: z
    .string()
    .nullable()
    .describe('yyyy-MM-dd by which the spend must be completed. Resolve relative phrases.'),
  skip: z.boolean(),
});

const REQUEST_SCHEMA = z.object({
  kind: z.enum(['date', 'yesno', 'spend_target']),
  answer: z.string().min(1).max(500),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contextHint: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return missingKeyResponse('/api/onboard/parse');

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
  const { kind, answer, today, contextHint } = parsed.data;

  const userText = [
    `Today: ${today}`,
    contextHint ? `Context: ${contextHint}` : null,
    `Answer: ${answer}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    if (kind === 'date') {
      const output = await generateStructuredObject({
        schema: DATE_OUT,
        instructions:
          'Parse a short answer to a date question (en-AU). Resolve relative phrases like "three weeks ago", "last March", "yesterday", "in 90 days", "next Friday" using the supplied "today" date. If the user said skip / pass / don\'t know / unsure, set skip=true and isoDate=null.',
        userText,
      });
      return NextResponse.json(output);
    }
    if (kind === 'yesno') {
      const output = await generateStructuredObject({
        schema: YESNO_OUT,
        instructions:
          'Parse a short yes/no answer. "yep", "yeah", "received it last week", "got it" → yes. "no", "nope", "not yet", "haven\'t" → no. Anything truly ambiguous → null.',
        userText,
      });
      return NextResponse.json(output);
    }
    // spend_target
    const output = await generateStructuredObject({
      schema: SPEND_TARGET_OUT,
      instructions:
        'Parse a min-spend target plus a deadline from one short phrase. Examples: "$3000 in 3 months" → amount=3000, deadlineIso=today+90d. "five grand by end of June" → amount=5000, deadlineIso=last day of next June. "skip" → skip=true. amount in AUD; deadlineIso yyyy-MM-dd resolved against today.',
      userText,
    });
    return NextResponse.json(output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[onboard/parse] generateText failed:', msg);
    return NextResponse.json({ error: 'parse failed', detail: msg }, { status: 502 });
  }
}
