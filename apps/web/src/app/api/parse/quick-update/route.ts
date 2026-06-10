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
    .enum([
      'spend',
      'benefit',
      'add_card',
      'cancel_card',
      'set_last4',
      'set_nickname',
      'question',
      'unknown',
    ])
    .describe(
      'spend = logging a transaction amount against a card ("add 250 to amex"). ' +
        'benefit = used/redeemed a card benefit ("used my hotel credit"). ' +
        'add_card = asking to add a card to their portfolio ("add my westpac altitude black", ' +
        '"i just got the amex platinum"). Fill cardSearchTerm with the catalogue name fragment. ' +
        'cancel_card = asking to cancel one of their held cards ("cancel my old amex", ' +
        '"close the citi rewards"). Fill cardSearchTerm. ' +
        'set_last4 = telling us the last four digits of a card ("that one ends in 1234", ' +
        '"last four is four two seven five"). Fill last4Value with exactly 4 digits. ' +
        'set_nickname = naming a card for reference ("call my westpac the travel card", ' +
        '"nickname the amex daily"). Fill nicknameValue. ' +
        'question = asking the Copilot anything — questions, greetings, off-topic redirects, ' +
        'advice requests, etc. ' +
        'unknown = ONLY for completely garbled / unparseable input. Prefer question for any ' +
        "coherent English that doesn't match an action above.",
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
  cardSearchTerm: z
    .string()
    .nullable()
    .describe(
      'For add_card / cancel_card: the spoken card name fragment used to fuzzy-match a card. ' +
        'Keep the relevant words (issuer + product, e.g. "westpac altitude black", "amex ' +
        'platinum"); strip filler ("add my", "cancel the", "i just got"). Null for other kinds.',
    ),
  last4Value: z
    .string()
    .nullable()
    .describe(
      'For set_last4: exactly 4 digits as a string ("1234", "4275"). Strip everything else ' +
        'including hyphens, spaces, "ends in", "the last four". Spoken digits ("one two three ' +
        'four", "four two seven five") must be converted. Null for other kinds OR if not ' +
        'exactly 4 digits could be extracted.',
    ),
  nicknameValue: z
    .string()
    .nullable()
    .describe(
      'For set_nickname: the short nickname the user wants to give the card ("travel card", ' +
        '"daily", "groceries"). Strip filler ("call it", "nickname it as", "the"). Null for ' +
        'other kinds.',
    ),
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
        'Classify the user intent into ONE kind, then fill the matching fields. ' +
        'ACTIONS (the user wants something done):\n' +
        '(1) SPEND — "add 250 to amex plat" → kind=spend, fill amount + spendCardId.\n' +
        '(2) BENEFIT — "used my hotel credit" → kind=benefit, fill benefit fields.\n' +
        '(3) ADD CARD — "add my westpac altitude black", "i just got the amex platinum", ' +
        '"new card: anz rewards" → kind=add_card, fill cardSearchTerm with the issuer+product ' +
        'fragment (strip "add my" / "i just got" / "new card:" filler).\n' +
        '(4) CANCEL CARD — "cancel my old amex", "close the citi rewards", "i cancelled my ' +
        'westpac" → kind=cancel_card, fill cardSearchTerm.\n' +
        '(5) LAST 4 — "that one ends in 1234", "last four is four two seven five", "the digits ' +
        'are 8 7 6 5" → kind=set_last4, fill last4Value (convert spoken digits to a 4-char ' +
        "string; null if you can't extract exactly 4 digits).\n" +
        '(6) NICKNAME — "call my westpac the travel card", "nickname the amex daily", "name it ' +
        'groceries" → kind=set_nickname, fill nicknameValue (strip "call it" / "nickname it ' +
        'as" / "the" filler).\n' +
        'CONVERSATION (the user wants an answer):\n' +
        '(7) QUESTION — anything else that\'s coherent English: questions ("what should my next ' +
        'card be?", "when does my westpac fee hit?"), greetings ("hi how are you"), off-topic ' +
        '("what\'s good to eat in sydney" — Copilot will polite-redirect), advice requests — ' +
        'ALL kind=question, no other fields needed (the client routes the original utterance ' +
        'to the Copilot which handles the response).\n' +
        'STRONG PREFERENCES:\n' +
        '- When in doubt between an action and a question, choose question. The Copilot can ' +
        'always ask the user to clarify. A wrong action fires a real mutation.\n' +
        '- Use kind=unknown ONLY for completely garbled / unparseable input (random ' +
        'characters, fragments). Never for coherent English.\n' +
        "- For set_last4 and set_nickname, the user doesn't need to name the card — the " +
        'client applies the change to the most-recently-mentioned card. Just extract the ' +
        'value.',
      userText: `Held cards:\n${heldList}\n\nBenefits on held cards:\n${benefitList}\n\nUtterance: ${parsed.data.utterance}`,
    });
    return NextResponse.json(output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[parse/quick-update] generateText failed:', msg);
    return NextResponse.json({ error: 'parse failed', detail: msg }, { status: 502 });
  }
}
