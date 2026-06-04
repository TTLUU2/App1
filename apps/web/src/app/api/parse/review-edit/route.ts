// POST /api/parse/review-edit
// Body:   { utterance, cardName, current: { activationDate, annualFeeNextDueDate,
//           bonusTarget, bonusSpendWindowEndDate }, contextDate }
// Output: { kind: 'update'|'save'|'cancel'|'unclear', field?, newValue?,
//           spokenResponse, confidence }
//
// The brain behind the voice review walkthrough on the Add Card review
// screen. Takes a spoken utterance and the current field values, then
// decides whether the user wants to edit one of the four review fields,
// save the card as-is, cancel out, or said something the model can't
// confidently route.
//
// `spokenResponse` is what the client TTS's back — letting Claude write
// it keeps the back-and-forth conversational without templating in code.

import { type NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateStructuredObject, missingKeyResponse } from '@/lib/ai-client';

const REQUEST_SCHEMA = z.object({
  utterance: z.string().min(1).max(500),
  cardName: z.string().min(1).max(120),
  current: z.object({
    activationDate: z.string(),
    annualFeeNextDueDate: z.string(),
    bonusTarget: z.number(),
    bonusSpendWindowEndDate: z.string(),
  }),
  /** Today's date in yyyy-MM-dd, AET. Used as the anchor for relative
   *  phrases like "last week" or "next Friday". */
  contextDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const PARSE_SCHEMA = z.object({
  kind: z
    .enum(['update', 'save', 'cancel', 'unclear'])
    .describe(
      'What the user wants to do. ' +
        "'update' = change one of the four review fields. " +
        "'save' = they're confirming the values and want to commit (phrases: 'save', 'looks good', 'all good', 'done', 'that's right', 'correct', 'no changes', 'yes save it'). " +
        "'cancel' = abort the add (phrases: 'cancel', 'never mind', 'forget it', 'go back'). " +
        "'unclear' = anything else, including ambiguous field references or unrelated commands like 'change the card'.",
    ),
  field: z
    .enum(['activationDate', 'annualFeeNextDueDate', 'bonusTarget', 'bonusSpendWindowEndDate'])
    .nullable()
    .describe(
      "When kind='update', the schema field to change. " +
        'activationDate = the approval date the issuer approved the application. ' +
        'annualFeeNextDueDate = when the annual fee will next be charged. ' +
        'bonusTarget = the minimum-spend dollar target for the sign-up bonus. ' +
        'bonusSpendWindowEndDate = the deadline by which the min-spend must be hit. ' +
        'Null for non-update kinds.',
    ),
  newValue: z
    .string()
    .nullable()
    .describe(
      "When kind='update', the new value as a string. " +
        "Dates: ALWAYS yyyy-MM-dd. Resolve relative phrases ('last March', 'three weeks ago') against contextDate, en-AU calendar. " +
        "bonusTarget: a plain number string, no $ or commas (e.g. '4500'). " +
        'Null for non-update kinds.',
    ),
  spokenResponse: z
    .string()
    .min(1)
    .max(180)
    .describe(
      'What to speak back to the user, en-AU, conversational. Examples: ' +
        "'Approval updated to 5 June. Anything else?' for an update; " +
        "'Saving now.' for save; " +
        "'No worries — backing out.' for cancel; " +
        "'Sorry, didn't catch which field — try again, or tap a field to edit directly.' for unclear. " +
        "Keep it short. Don't say 'AUD' for currency — TTS reads it weirdly. Just 'dollars' or numerals.",
    ),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .describe(
      'high = field + value are unambiguous; medium = value plausible but interpretation arguable; low = guessing.',
    ),
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return missingKeyResponse('/api/parse/review-edit');

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

  const { utterance, cardName, current, contextDate } = parsed.data;

  try {
    const output = await generateStructuredObject({
      schema: PARSE_SCHEMA,
      instructions: [
        "You're parsing voice/typed responses on a credit card 'review the details' screen.",
        'The user has just heard a spoken summary of four pre-filled values and is now telling you what (if anything) needs correcting.',
        "The user is in Australia (en-AU). Today's date is " + contextDate + '.',
        "Resolve relative dates against today and en-AU calendar (DD/MM/YYYY ordering — '5 June' = June 5th).",
        'When a year is omitted on a date, prefer the one that keeps the value plausible given the current field value and the chronology of card setup (approval → fee due 12mo later → spend-by ~90d after approval).',
        'If the utterance is a save/cancel command, set kind accordingly and leave field/newValue null.',
        "If the utterance is anything we can't confidently map (including 'change the card', 'I want a different card', 'undo', or anything off-topic), set kind='unclear' with a helpful spokenResponse that points the user back to tappable affordances.",
        "Always populate spokenResponse — it's the friendly voice confirmation. Keep it short and natural for TTS.",
      ].join(' '),
      userText: [
        `Card: ${cardName}`,
        `Current values:`,
        `  Approval date: ${current.activationDate}`,
        `  Annual fee next due: ${current.annualFeeNextDueDate}`,
        `  Min spend target: $${current.bonusTarget}`,
        `  Spend-by deadline: ${current.bonusSpendWindowEndDate}`,
        ``,
        `Utterance: ${utterance}`,
      ].join('\n'),
    });
    return NextResponse.json(output);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
