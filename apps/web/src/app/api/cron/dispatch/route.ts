// GET /api/cron/dispatch — daily cron handler that scans alert_projections
// for rows whose fire_on_date has arrived (and that haven't been dispatched
// yet), then sends a web-push to every live subscription belonging to the
// owning device. Marks projections dispatched after send and revokes
// subscriptions that come back gone/expired.
//
// Auth: Vercel Cron requests carry `Authorization: Bearer <CRON_SECRET>`.
// We compare against the env var so the route can't be triggered by
// anything that doesn't know the secret.

import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, isNull, lte } from 'drizzle-orm';
import { getDb } from '@/db';
import { alertProjections, pushSubscriptions } from '@/db/schema';
import { sendPush, subscriptionFromDb } from '@/lib/push';

export const runtime = 'nodejs';
// Cron handler shouldn't be cached. Cap below Vercel's max so we don't
// silently get killed mid-batch.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Auth — Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  const header = req.headers.get('authorization');
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const todayIso = new Date().toISOString().slice(0, 10);

  // Pull every projection that's due — small dataset, no pagination needed
  // until we have thousands of users.
  const due = await db
    .select()
    .from(alertProjections)
    .where(and(isNull(alertProjections.dispatchedAt), lte(alertProjections.fireOnDate, todayIso)));

  if (due.length === 0) {
    return NextResponse.json({ ok: true, scanned: 0, dispatched: 0, gone: 0 });
  }

  // Group projections by deviceId so we can fetch each device's
  // subscriptions in one round-trip per device.
  const byDevice = new Map<string, typeof due>();
  for (const p of due) {
    const arr = byDevice.get(p.deviceId) ?? [];
    arr.push(p);
    byDevice.set(p.deviceId, arr);
  }

  let dispatched = 0;
  let goneCount = 0;
  const goneEndpoints = new Set<string>();

  for (const [deviceId, projections] of byDevice) {
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.deviceId, deviceId), isNull(pushSubscriptions.revokedAt)));

    if (subs.length === 0) {
      // Device has no live subs — mark projections dispatched so we don't
      // re-scan them every day. (If user re-subscribes later, they'll get
      // future alerts but won't be retroactively notified for past ones.)
      for (const p of projections) {
        await db
          .update(alertProjections)
          .set({ dispatchedAt: new Date() })
          .where(eq(alertProjections.id, p.id));
      }
      continue;
    }

    for (const p of projections) {
      // Fan out: every live sub for this device gets the notification.
      const results = await Promise.all(
        subs.map((sub) =>
          sendPush(subscriptionFromDb(sub), {
            title: p.title,
            body: p.body,
            url: p.dataUrl ?? '/optimisation',
            tag: `${p.sourceCardId}:${p.alertType}`,
          }).then((r) => ({ sub, r })),
        ),
      );

      const anyDelivered = results.some((x) => x.r.ok);
      if (anyDelivered) dispatched++;

      // Revoke gone subscriptions exactly once per pass.
      for (const { sub, r } of results) {
        if (!r.ok && r.gone) {
          goneEndpoints.add(sub.endpoint);
        }
      }

      // Mark dispatched regardless of delivery success — we don't retry
      // failed pushes (browsers will deliver up to the TTL in lib/push.ts).
      await db
        .update(alertProjections)
        .set({ dispatchedAt: new Date() })
        .where(eq(alertProjections.id, p.id));
    }
  }

  // Soft-delete gone subscriptions in one pass.
  for (const endpoint of goneEndpoints) {
    await db
      .update(pushSubscriptions)
      .set({ revokedAt: new Date() })
      .where(eq(pushSubscriptions.endpoint, endpoint));
    goneCount++;
  }

  return NextResponse.json({
    ok: true,
    scanned: due.length,
    dispatched,
    gone: goneCount,
  });
}
