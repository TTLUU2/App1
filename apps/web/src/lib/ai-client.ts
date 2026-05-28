// Shared helper for server-side Anthropic calls. Centralises:
//   - the model id (kept here so swapping it is a one-line change)
//   - the 503 when no key is configured
//   - basic error logging
//
// All callers route through generateText with Output.object — AI SDK 6
// removed `generateObject`; the new pattern is `output: Output.object({...})`
// on generateText. See packages/.../node_modules/ai/docs/03-ai-sdk-core/
// 10-generating-structured-data.mdx for the canonical example.

import { NextResponse } from 'next/server';
import { generateText, Output } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { z } from 'zod';

export const ANTHROPIC_MODEL_ID = 'claude-sonnet-4-6';

export function missingKeyResponse(endpoint: string): Response {
  return NextResponse.json(
    {
      error: `ANTHROPIC_API_KEY is not set. The ${endpoint} endpoint cannot run without it. Add it to apps/web/.env.local.`,
    },
    { status: 503 },
  );
}

export interface AiObjectCallOptions<S extends z.ZodTypeAny> {
  /** System / instruction text shown to the model. */
  instructions: string;
  /** User-side content (text + optional media). */
  userText: string;
  /** Zod schema describing the desired output object. */
  schema: S;
}

export async function generateStructuredObject<S extends z.ZodTypeAny>(
  opts: AiObjectCallOptions<S>,
): Promise<z.infer<S>> {
  const { output } = await generateText({
    model: anthropic(ANTHROPIC_MODEL_ID),
    output: Output.object({ schema: opts.schema }),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: opts.instructions },
          { type: 'text', text: opts.userText },
        ],
      },
    ],
  });
  // generateText widens the inferred Output type to `unknown` when wrapped
  // through a generic schema parameter. Cast back via the schema's inferred
  // type — Zod parsing has already enforced the runtime shape upstream.
  return output as z.infer<S>;
}
