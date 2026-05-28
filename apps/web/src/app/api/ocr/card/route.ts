// POST /api/ocr/card
//
// Accepts: { image: <base64 string, no data: prefix>, mediaType: 'image/jpeg' | 'image/png' }
// Returns: { product, issuer, last4, expiry, cardholderName, matchedCardId, confidence }
//
// Privacy (PRD §11.2.3, §18.1):
//   - The image is held in memory for the duration of the request only; never
//     persisted to disk and never logged.
//   - The model is explicitly NOT asked for the full PAN. If it returns one
//     anyway, the response sanitiser strips any 13–19-digit run from every
//     string field except `last4`.
//   - last4 must be exactly four digits; anything else becomes null.
//   - Anthropic's API does not retain inputs by default — note in Decisions.

import { NextResponse, type NextRequest } from 'next/server';
import { generateText, Output } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { getCardsWithIssuer } from '@ph/shared';
import { matchCardFromOcr } from '@/lib/match-card';

const REQUEST_SCHEMA = z.object({
  image: z.string().min(100, 'image too small or missing'),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

const OCR_SCHEMA = z.object({
  productName: z
    .string()
    .nullable()
    .describe(
      'The marketed product name from the card face, e.g. "Platinum Card" or "Qantas Rewards Signature". Null if not legible.',
    ),
  issuer: z
    .string()
    .nullable()
    .describe(
      'The issuing bank as printed: e.g. "American Express", "ANZ", "Westpac". Null if not legible.',
    ),
  last4: z
    .string()
    .nullable()
    .describe(
      'The last four digits of the printed card number. Null if the digits are not legible. Must be exactly four digits if present.',
    ),
  expiryMonthYear: z
    .string()
    .nullable()
    .describe('Printed expiry as MM/YY (e.g. "03/29"). Null if not legible.'),
});

const DIGITS_13_19 = /\b\d{13,19}\b/g;

function sanitise(value: string | null): string | null {
  if (value == null) return null;
  const stripped = value.replace(DIGITS_13_19, '[REDACTED]');
  return stripped;
}

const MODEL_ID = 'claude-sonnet-4-6';

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          'ANTHROPIC_API_KEY is not set. Add it to apps/web/.env.local (see .env.example). The OCR endpoint cannot run without it.',
      },
      { status: 503 },
    );
  }

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
    const { output } = await generateText({
      model: anthropic(MODEL_ID),
      output: Output.object({ schema: OCR_SCHEMA }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'You are extracting product metadata from a photo of a physical credit card. ' +
                'Return ONLY the four fields requested. Do NOT return the full card number — ' +
                'only the last four digits in the dedicated field. Do not include CVV / CVC. ' +
                'If a field is not legible, return null for that field. Australian cards.',
            },
            {
              type: 'image',
              image: parsed.data.image,
              mediaType: parsed.data.mediaType,
            },
          ],
        },
      ],
    });

    const productName = sanitise(output.productName);
    const issuer = sanitise(output.issuer);
    const expiryMonthYear = sanitise(output.expiryMonthYear);
    const last4Raw = output.last4 ?? '';
    const last4 = /^\d{4}$/.test(last4Raw) ? last4Raw : null;

    const match = matchCardFromOcr({ productName, issuer }, getCardsWithIssuer());

    return NextResponse.json({
      extracted: { productName, issuer, last4, expiryMonthYear },
      matchedCardId: match?.cardId ?? null,
      matchScore: match?.score ?? 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Minimal observability — full Sentry/PostHog wiring is M5 scope (PRD §20).
    console.error('[ocr] generateText failed:', msg);
    return NextResponse.json({ error: 'OCR failed', detail: msg }, { status: 502 });
  }
}
