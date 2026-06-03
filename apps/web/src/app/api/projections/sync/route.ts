// POST /api/projections/sync — replace all alert projections for one
// (deviceId, sourceCardId) pair. Idempotent: re-syncing with the same
// payload is a no-op; passing `projections: []` clears them (used when a
// card is cancelled / deleted).
//
// Implemented as delete-then-insert in a transaction-ish sequence. Neon's
// HTTP driver doesn't support multi-statement txns directly, but the
// unique constraint on (device_id, alert_type, source_card_id,
// fire_on_date) means a partial failure is safe — re-running the sync
// converges.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { alertProjections } from '@/db/schema';

export const runtime = 'nodejs';

const ProjectionSchema = z.object({
  alertType: z.string().min(1).max(64),
  fireOnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected yyyy-MM-dd'),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(300),
  url: z.string().max(256).optional(),
});

const BodySchema = z.object({
  deviceId: z.string().min(1).max(128),
  sourceCardId: z.string().min(1).max(128),
  projections: z.array(ProjectionSchema).max(20),
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

  const { deviceId, sourceCardId, projections } = parsed.data;
  const db = getDb();

  // Clear old.
  await db
    .delete(alertProjections)
    .where(
      and(eq(alertProjections.deviceId, deviceId), eq(alertProjections.sourceCardId, sourceCardId)),
    );

  // Insert new (skip the round-trip if empty).
  if (projections.length > 0) {
    await db.insert(alertProjections).values(
      projections.map((p) => ({
        deviceId,
        sourceCardId,
        alertType: p.alertType,
        fireOnDate: p.fireOnDate,
        title: p.title,
        body: p.body,
        dataUrl: p.url ?? null,
      })),
    );
  }

  return NextResponse.json({ ok: true, count: projections.length });
}
