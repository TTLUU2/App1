// POST /api/push/unsubscribe — soft-delete a subscription (set revokedAt).
// Client calls this when user disables notifications, or when the SW's
// pushManager.subscribe() returns null because permission was revoked.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { pushSubscriptions } from '@/db/schema';

export const runtime = 'nodejs';

const BodySchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', detail: parsed.error.issues },
      { status: 400 },
    );
  }

  const db = getDb();
  await db
    .update(pushSubscriptions)
    .set({ revokedAt: new Date() })
    .where(eq(pushSubscriptions.endpoint, parsed.data.endpoint));

  return NextResponse.json({ ok: true });
}
