// GET /api/balances/latest?deviceId=X — return the newest server-known
// balance per program for the given device. The email-sync backend
// writes balance_updates when an inbound Qantas/Velocity email is
// parsed; this endpoint is how the client reads them back.
//
// Shape: array of one row per program the device has ever had a
// balance for. If nothing landed yet, empty array — the client keeps
// whatever manual value it has locally. The client merges by
// programId; last-write-wins on balance, and any local user edit
// after the server snapshotAt takes precedence (handled client-side).

import { NextResponse, type NextRequest } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { balanceUpdates } from '@/db/schema';

export const runtime = 'nodejs';
// No caching — this reflects live inbound-email arrivals, and the
// device query key already keys per-user. Any stale reply would show a
// user their previous balance for the browser session, which is worse
// than a fresh DB read on every load.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('deviceId')?.trim();
  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId required' }, { status: 400 });
  }
  const db = getDb();

  // Pull every row for the device, newest first. Dedup by programId in
  // JS — Postgres DISTINCT ON would work but requires a mixed ORDER BY
  // that Drizzle's typed builder makes awkward for one program per
  // month of history. The row count per device stays small (a few
  // hundred at worst) so the memory dedup is cheap.
  const rows = await db
    .select({
      programId: balanceUpdates.programId,
      balance: balanceUpdates.balance,
      receivedAt: balanceUpdates.receivedAt,
    })
    .from(balanceUpdates)
    .where(eq(balanceUpdates.deviceId, deviceId))
    .orderBy(desc(balanceUpdates.receivedAt));

  const latestByProgram = new Map<
    string,
    { programId: string; balance: number; receivedAt: string }
  >();
  for (const r of rows) {
    if (!latestByProgram.has(r.programId)) {
      latestByProgram.set(r.programId, {
        programId: r.programId,
        balance: Number(r.balance),
        receivedAt: r.receivedAt.toISOString(),
      });
    }
  }

  return NextResponse.json({
    balances: Array.from(latestByProgram.values()),
  });
}
