// POST /api/ask
// Body:   { question, context }
// Output: { answer }
//
// PRD §11.5 — Ask Copilot. Read-only Q&A over the user's local data plus the
// bundled catalogue. The model is constrained to answer ONLY from the
// provided context; out-of-scope questions get a polite refusal naming what
// the assistant can answer.
//
// Privacy: PRD §11.5.2/§12.3 — voice transcripts are transient. Session
// history is not persisted in v1; the caller sends one question per turn.

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateStructuredObject, missingKeyResponse } from '@/lib/ai-client';

const REQUEST_SCHEMA = z.object({
  question: z.string().min(1).max(500),
  context: z.string().max(20000), // pre-formatted markdown context block
});

const ANSWER_SCHEMA = z.object({
  answer: z
    .string()
    .describe(
      'A short, conversational answer (one to three sentences). Cite the underlying data when possible (e.g. "Based on your spend update on 12 May..."). If the question is out of scope, refuse politely and list what you CAN answer: min-spend progress, benefit expiry, eligibility status, annual fee dates, recommendations.',
    ),
  inScope: z.boolean().describe("true if you answered from the user's data; false if you refused."),
});

const SYSTEM_INSTRUCTIONS = `You are the Point Hacks Copilot assistant. You are READ-ONLY: never claim to update spend, mark benefits used, add cards, or take any action. If asked to do something mutating, say "I can't change anything from here — use the FAB Update spend / Update benefits / Add card flows."

Answer ONLY from the user's data and the bundled card catalogue you've been given. Do not invent facts. If the data doesn't cover the question, say so plainly. Stay tight: one to three sentences. Australian context, en-AU, AUD.

You CAN answer: min-spend progress, benefit expiry, eligibility status (eligible / waiting / grey area / not eligible), annual fee dates, recommendations from Tab 4, summaries of held vs cancelled cards. You CANNOT answer: general financial advice, things outside the user's data, predictions about future offers, hypotheticals about cards not in the catalogue.`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return missingKeyResponse('/api/ask');

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

  try {
    const output = await generateStructuredObject({
      schema: ANSWER_SCHEMA,
      instructions: SYSTEM_INSTRUCTIONS,
      userText: `# User context (the only source of truth)\n\n${parsed.data.context}\n\n# Question\n\n${parsed.data.question}`,
    });
    return NextResponse.json(output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ask] generateText failed:', msg);
    return NextResponse.json({ error: 'ask failed', detail: msg }, { status: 502 });
  }
}
