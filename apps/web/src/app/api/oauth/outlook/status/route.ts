// GET  /api/oauth/outlook/status?deviceId=…   → { connected, email, lastSyncAt, revoked }
// POST /api/oauth/outlook/status body { deviceId, action: 'disconnect' } → marks revoked
//
// Small utility endpoint the UI hits on mount to render the correct
// state ('Connect Outlook' button vs 'Connected to alice@… · Refresh'
// row) and to let the user disconnect. Disconnect is a soft delete —
// the row is kept for audit; a reconnect via /start updates the same
// row in place.

import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { linkedOutlookAccounts } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('deviceId')?.trim();
  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId required' }, { status: 400 });
  }
  const db = getDb();
  const rows = await db
    .select({
      email: linkedOutlookAccounts.email,
      revokedAt: linkedOutlookAccounts.revokedAt,
      lastSyncAt: linkedOutlookAccounts.lastSyncAt,
      connectedAt: linkedOutlookAccounts.connectedAt,
    })
    .from(linkedOutlookAccounts)
    .where(eq(linkedOutlookAccounts.deviceId, deviceId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({
    connected: !row.revokedAt,
    revoked: !!row.revokedAt,
    email: row.email,
    connectedAt: row.connectedAt.toISOString(),
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
  });
}

const PostBodySchema = z.object({
  deviceId: z.string().min(1).max(128),
  action: z.enum(['disconnect']),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const { deviceId } = parsed.data;
  const db = getDb();
  await db
    .update(linkedOutlookAccounts)
    .set({ revokedAt: new Date() })
    .where(and(eq(linkedOutlookAccounts.deviceId, deviceId)));
  return NextResponse.json({ ok: true });
}
