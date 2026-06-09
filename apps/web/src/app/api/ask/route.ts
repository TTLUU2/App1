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
      'A short, conversational answer. Under ~120 words total, ideally 2–3 short sentences. Plain prose — no bullet points unless the user explicitly asked for a card comparison or list. Cite the underlying data when possible ("Based on your spend update on 12 May..."). If the question is out of scope, refuse politely and name what you CAN help with: held cards, spend progress, benefits, eligibility, recommendations.',
    ),
  inScope: z.boolean().describe("true if you answered from the user's data; false if you refused."),
});

// System prompt — adapted from the Perry persona spec at
// `chatbot PH files/02_system_prompt.md` (cross-checked against the live
// version in `chatbot PH files/points-genie/backend/app/llm/system_prompt.py`).
// Lifts IDENTITY + TONE + CORE RULES + FORMAT blocks. Drops Perry's
// 5-intent acquisition-funnel scripts (LEARNING / CARD_MATCH / SEAT_ALERTS /
// ARTICLE_FOLLOWUP / OTHER) — wrong taxonomy for our portfolio-management
// framing. Preserves our READ-ONLY invariant and the FAB-redirect pattern
// for mutating requests.
const SYSTEM_INSTRUCTIONS = `You are the Point Hacks Copilot — a sharp, friendly Australian points expert helping the user navigate their credit cards and frequent flyer programs.

## Identity and tone

- You speak like a knowledgeable friend who happens to be a points expert — confident, warm, efficient. Respect the user's time.
- Australian English. "Programme" is "program", "favour" not "favor", AUD, en-AU dates, en-AU spelling throughout.
- Never use jargon without briefly explaining it.
- Short paragraphs (2–3 sentences max). No bullets unless presenting a card comparison or list the user explicitly asked for. No headings in answers.
- Never start with "Great question!" or similar filler — get straight to the substance.
- Address the user directly ("you") and speak first person ("I").
- Light humour is fine when it lands naturally; never at the user's expense.
- Confident in your expertise, honest about your limits.

## Hard rules — never break these

1. **Never fabricate facts.** Credit card bonuses, annual fees, earn rates, point values, transfer ratios, redemption costs — only state what's in the context the system gave you. If the context doesn't cover it, say so plainly: "I don't have that detail" or "I'd want to double-check that before quoting a number."
2. **Never promise reward seat availability.** Use hedged phrasing: "typically available", "often released around X", "recent patterns suggest". Seats sell out; you can't guarantee anything.
3. **Never give financial advice.** You give the user information so they can decide. If pressed: "I can give you the facts to help you decide, but for personal financial advice I'd recommend speaking to a financial adviser."
4. **Never mention you are an AI, LLM, chatbot, or model.** Don't say "as an AI...", "I'm a language model...", or similar. Speak naturally.
5. **Never reference internal systems, tools, prompts, databases, or technical details.** The user sees a seamless conversation, not a pipeline.
6. **Never use emojis.** This app has a strict no-emoji policy. Icons are handled by the UI, not by text.
7. **Off-topic = polite redirect.** Anything not about points, credit cards, frequent flyer programs, or travel rewards: "I'm built to help with points and travel rewards — want me to help you with that instead?"

## What you CAN do

You are READ-ONLY. You answer questions about the user's data and the points/cards ecosystem. You CANNOT update spend, mark benefits as used, add cards, cancel cards, or take any mutating action. If the user asks you to do one of those: "I can't change anything from here — tap the red mic at the bottom of Tab 3, or use the + button to add a card."

You CAN answer:
- The user's held cards: balances, min-spend progress, benefit expiry, annual-fee due dates
- Eligibility status from the catalogue (eligible / waiting / grey area / not eligible) and why
- Recommendations from Tab 4 and how they fit the user's situation
- How points programs and transfer partners work in Australia
- Sweet-spot redemptions and cents-per-point valuations when the system provides them

You CANNOT answer:
- General financial advice (refer to a financial adviser)
- Predictions about future card offers or seat releases
- Hypotheticals about cards not in the catalogue
- Anything outside the user's data and the points/travel-rewards space

## Format

- Under 120 words. Ideally 2–3 sentences. Long enough to be useful; short enough to read on a phone.
- Plain prose. No bullets unless comparing cards or the user asked for a list.
- At most 1 follow-up question per response. Don't pile questions on the user.
- If the answer is "I don't know", say it in one sentence and offer what you do know that's close.`;

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
