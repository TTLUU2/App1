// POST /api/push/test — fire a test notification to every live subscription
// belonging to a given deviceId. Used by the settings UI's "Send test
// notification" button to verify the full chain (browser → server → VAPID
// → push service → SW → notification) before relying on real alerts.
//
// Returns a per-subscription delivery summary so the UI can show "1/2
// delivered, 1 expired" rather than a binary success/fail.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { sendPush, subscriptionFromDb } from '@/lib/push';

export const runtime = 'nodejs';

const BodySchema = z.object({
  deviceId: z.string().min(1).max(128),
  title: z.string().max(120).optional(),
  body: z.string().max(300).optional(),
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
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.deviceId, parsed.data.deviceId),
        isNull(pushSubscriptions.revokedAt),
      ),
    );

  if (subs.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'no live subscriptions for this device' },
      { status: 404 },
    );
  }

  const title = parsed.data.title ?? 'Point Hacks Copilot';
  const body_ = parsed.data.body ?? 'Test notification — your push setup is working.';

  // Send in parallel; collect results. Mark gone subscriptions revoked so
  // we don't keep retrying on the next cron tick.
  const results = await Promise.all(
    subs.map(async (sub) => {
      const res = await sendPush(subscriptionFromDb(sub), {
        title,
        body: body_,
        url: '/optimisation',
        tag: 'test-notification',
      });
      if (!res.ok && res.gone) {
        await db
          .update(pushSubscriptions)
          .set({ revokedAt: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));
      }
      return {
        endpoint: sub.endpoint.slice(0, 60) + '…', // truncated for response payload
        delivered: res.ok,
        statusCode: res.statusCode,
        ...(res.ok ? {} : { gone: res.gone, error: res.gone ? undefined : res.error }),
      };
    }),
  );

  const delivered = results.filter((r) => r.delivered).length;
  return NextResponse.json({
    ok: delivered > 0,
    delivered,
    total: results.length,
    results,
  });
}
