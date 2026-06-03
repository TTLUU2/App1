// POST /api/push/subscribe — upsert a web-push subscription for this
// device. Idempotent on `endpoint` (the unique constraint on the table),
// so the client can safely re-call this on every page load to refresh
// userAgent / opted-in alert types without stacking duplicates.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db';
import { pushSubscriptions } from '@/db/schema';

export const runtime = 'nodejs'; // @neondatabase/serverless works in edge too,
// but web-push (used elsewhere in the slab) needs Node. Keep all push
// routes consistently on Node so we don't accidentally split runtimes.

const BodySchema = z.object({
  deviceId: z.string().min(1).max(128),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  optedInTypes: z.array(z.string()).optional(),
  userAgent: z.string().max(512).optional(),
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

  const { deviceId, subscription, optedInTypes, userAgent } = parsed.data;
  const db = getDb();

  const values = {
    deviceId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent: userAgent ?? null,
    ...(optedInTypes ? { optedInTypes } : {}),
  };

  const updateSet: Record<string, unknown> = {
    deviceId,
    p256dh: values.p256dh,
    auth: values.auth,
    userAgent: values.userAgent,
    revokedAt: null,
  };
  if (optedInTypes) updateSet.optedInTypes = optedInTypes;

  await db.insert(pushSubscriptions).values(values).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: updateSet,
  });

  return NextResponse.json({ ok: true });
}
