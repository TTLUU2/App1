// POST /api/sync/outlook — body { deviceId }
//
// User-triggered ('Refresh') sync. For the given deviceId:
//   1. Load the linked_outlook_accounts row + decrypt refresh_token.
//   2. Mint a fresh access_token via MS's token endpoint.
//   3. Query Graph /me/messages filtered to Qantas + Velocity senders,
//      last 30 days, ordered newest-first.
//   4. Feed each message through the shared parseInboundEmail pipeline.
//   5. Write email_events + balance_updates rows exactly the same way
//      the inbound-email webhook does — so a message that arrived via
//      forwarding AND OAuth dedupes on the messageId uniqueness index.
//
// Errors mark the row as revoked when the refresh_token is proven
// invalid (Graph 401 on refresh); the user then needs to reconnect.
// Transient errors (Graph 5xx, network) surface to the client as a
// non-fatal error with { synced: 0 }.

import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { balanceUpdates, emailEvents, linkedOutlookAccounts } from '@/db/schema';
import { decryptToken } from '@/lib/oauth-crypto';
import { parseInboundEmail } from '@/lib/email-parsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_MESSAGES_URL = 'https://graph.microsoft.com/v1.0/me/messages';
const SCOPE = 'Mail.Read offline_access User.Read';

const BodySchema = z.object({ deviceId: z.string().min(1).max(128) });

// Which sender-domain patterns the sync will fetch. Kept in one
// place because Graph's $filter uses OR-joined `from/emailAddress/
// address` clauses and the same set is used to shape the query.
const SYNC_SENDER_DOMAINS = [
  'qantas.com',
  'qantasloyalty.com',
  'e.qantas.com',
  'velocityfrequentflyer.com',
  'e.velocityfrequentflyer.com',
  'virginaustralia.com',
];

interface GraphMessage {
  id: string;
  internetMessageId: string;
  subject: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: Array<{ emailAddress?: { address?: string } }>;
  body?: { contentType?: string; content?: string };
  bodyPreview?: string;
  receivedDateTime: string;
}

export async function POST(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'outlook oauth not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const { deviceId } = parsed.data;
  const db = getDb();

  const rows = await db
    .select()
    .from(linkedOutlookAccounts)
    .where(and(eq(linkedOutlookAccounts.deviceId, deviceId)))
    .limit(1);
  const account = rows[0];
  if (!account) {
    return NextResponse.json({ error: 'not_connected' }, { status: 404 });
  }
  if (account.revokedAt) {
    return NextResponse.json({ error: 'revoked' }, { status: 410 });
  }

  // Decrypt refresh_token. If the crypto helper throws (tamper, key
  // mismatch, malformed row), mark the account revoked so the user
  // has to reconnect — better than looping on a broken token.
  let refreshToken: string;
  try {
    refreshToken = decryptToken(account.refreshTokenEncrypted);
  } catch {
    await db
      .update(linkedOutlookAccounts)
      .set({ revokedAt: new Date() })
      .where(eq(linkedOutlookAccounts.id, account.id));
    return NextResponse.json({ error: 'token_decrypt_failed' }, { status: 410 });
  }

  // Trade the refresh token for a fresh access token.
  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: SCOPE,
  });
  let accessToken: string;
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });
    if (res.status === 400 || res.status === 401) {
      // Microsoft rejected the refresh token — user revoked us on
      // their side, or the token expired past its long-lived window.
      // Mark revoked so the UI prompts a reconnect.
      await db
        .update(linkedOutlookAccounts)
        .set({ revokedAt: new Date() })
        .where(eq(linkedOutlookAccounts.id, account.id));
      return NextResponse.json({ error: 'refresh_rejected' }, { status: 410 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'refresh_transient', status: res.status }, { status: 502 });
    }
    const tokens = (await res.json()) as { access_token: string };
    accessToken = tokens.access_token;
  } catch {
    return NextResponse.json({ error: 'refresh_network' }, { status: 502 });
  }

  // Build the Graph $filter. Received in the last 30 days AND from
  // one of our sender domains. Graph's $filter can't do endsWith on
  // address; we use `contains(from/emailAddress/address, 'domain')`
  // which matches sub-domains too.
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const fromFilter = SYNC_SENDER_DOMAINS.map(
    (d) => `contains(from/emailAddress/address, '${d}')`,
  ).join(' or ');
  const graphUrl = new URL(GRAPH_MESSAGES_URL);
  graphUrl.searchParams.set(
    '$filter',
    `receivedDateTime ge ${thirtyDaysAgoIso} and (${fromFilter})`,
  );
  graphUrl.searchParams.set(
    '$select',
    'id,internetMessageId,subject,from,toRecipients,body,bodyPreview,receivedDateTime',
  );
  graphUrl.searchParams.set('$top', '50');
  graphUrl.searchParams.set('$orderby', 'receivedDateTime desc');

  let messages: GraphMessage[] = [];
  try {
    const res = await fetch(graphUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: 'graph_query_failed', status: res.status },
        { status: 502 },
      );
    }
    const json = (await res.json()) as { value?: GraphMessage[] };
    messages = json.value ?? [];
  } catch {
    return NextResponse.json({ error: 'graph_network' }, { status: 502 });
  }

  // Process each message. The parseInboundEmail router doesn't care
  // where the email came from — it just needs the normalised shape.
  // We write to email_events with the internetMessageId as the
  // dedup key; the unique index quietly rejects any that already
  // landed via Postmark forwarding.
  let synced = 0;
  let skipped = 0;
  for (const m of messages) {
    if (!m.internetMessageId) continue;
    const fromAddr = m.from?.emailAddress?.address ?? '';
    const fromName = m.from?.emailAddress?.name ?? '';
    const toAddr = m.toRecipients?.[0]?.emailAddress?.address ?? '';
    const text =
      m.body?.contentType === 'text'
        ? (m.body?.content ?? '')
        : m.body?.content
          ? m.body.content.replace(/<[^>]+>/g, ' ')
          : (m.bodyPreview ?? '');
    const receivedAt = new Date(m.receivedDateTime);

    const outcome = parseInboundEmail({
      fromEmail: fromAddr,
      fromName,
      subject: m.subject ?? '',
      text,
      receivedAt,
    });

    const baseEvent = {
      messageId: m.internetMessageId,
      // The Outlook path doesn't route via a slug — use the deviceId
      // directly so the audit trail still points at the right owner.
      toSlug: toAddr || '(outlook-oauth)',
      deviceId,
      fromEmail: fromAddr,
      subject: m.subject ?? '',
      rawText: text,
    };

    try {
      if (outcome.kind === 'balance') {
        const [eventRow] = await db
          .insert(emailEvents)
          .values({
            ...baseEvent,
            status: 'parsed',
            programId: outcome.programId,
            detail: {
              balance: outcome.balance,
              snapshotAt: outcome.snapshotAt.toISOString(),
              ...(typeof outcome.statusCredits === 'number'
                ? { statusCredits: outcome.statusCredits }
                : {}),
              ...(outcome.tier ? { tier: outcome.tier } : {}),
              ...(outcome.memberId ? { memberId: outcome.memberId } : {}),
            },
          })
          .onConflictDoNothing({ target: emailEvents.messageId })
          .returning({ id: emailEvents.id });

        // onConflictDoNothing returns empty when the messageId
        // already existed (e.g. Postmark forwarding beat us to it).
        // Skip the balance_updates write in that case so we don't
        // double-count.
        if (eventRow) {
          await db.insert(balanceUpdates).values({
            deviceId,
            programId: outcome.programId,
            balance: String(outcome.balance),
            statusCredits:
              typeof outcome.statusCredits === 'number' ? String(outcome.statusCredits) : null,
            tier: outcome.tier ?? null,
            memberId: outcome.memberId ?? null,
            snapshotAt: outcome.snapshotAt,
            source: 'outlook',
            sourceEventId: eventRow.id,
          });
          synced += 1;
        } else {
          skipped += 1;
        }
      } else if (outcome.kind === 'gmail_verification') {
        // Extremely unlikely on Outlook but harmless — record it and
        // move on. Don't try to auto-confirm; that path is Gmail-only.
        await db
          .insert(emailEvents)
          .values({ ...baseEvent, status: 'ignored', detail: { reason: 'gmail_verification' } })
          .onConflictDoNothing({ target: emailEvents.messageId });
        skipped += 1;
      } else if (outcome.kind === 'ignored') {
        await db
          .insert(emailEvents)
          .values({ ...baseEvent, status: 'ignored', detail: { reason: outcome.reason } })
          .onConflictDoNothing({ target: emailEvents.messageId });
        skipped += 1;
      } else {
        // outcome.kind === 'unknown' — sender not one of our parsable
        // programs. Log and move on.
        await db
          .insert(emailEvents)
          .values({
            ...baseEvent,
            status: 'ignored',
            detail: { reason: 'no parser matched sender' },
          })
          .onConflictDoNothing({ target: emailEvents.messageId });
        skipped += 1;
      }
    } catch {
      // A single row's write failure shouldn't tank the whole sync —
      // keep going. The next attempt will pick this message up again.
      skipped += 1;
    }
  }

  await db
    .update(linkedOutlookAccounts)
    .set({ lastSyncAt: new Date() })
    .where(eq(linkedOutlookAccounts.id, account.id));

  return NextResponse.json({ ok: true, synced, skipped, scanned: messages.length });
}
