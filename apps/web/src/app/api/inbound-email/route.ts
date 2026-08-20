// POST /api/inbound-email — Postmark inbound webhook receiver.
//
// Postmark posts a JSON payload for every mail landing at
// `{slug}@phcopilot.app`. This route:
//
//   1. Verifies Basic Auth credentials (Postmark sends the creds
//      configured on the inbound server; env-gated).
//   2. Idempotency check on Postmark's MessageID — a retried delivery
//      returns 200 without re-processing.
//   3. Resolves the To slug back to a deviceId via linked_email_forwards.
//   4. Dispatches through the parser framework.
//   5. On a balance outcome, writes to balance_updates.
//   6. On a Gmail verification outcome, hits Google's confirm URL to
//      auto-complete the forwarding setup.
//   7. Logs every step to email_events so support can trace back from
//      any user's balance to the exact mail that produced it.
//
// Errors during parsing DO NOT return 500 — Postmark treats non-2xx
// as retryable, and we don't want an unparseable email to retry
// forever. Instead we log the error to email_events and return 200.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { balanceUpdates, emailEvents, linkedEmailForwards } from '@/db/schema';
import { parseInboundEmail } from '@/lib/email-parsers';
import { confirmGmailForwardingUrl } from '@/lib/email-parsers/gmail-verify';

export const runtime = 'nodejs';

// Postmark's inbound JSON shape — narrowly typed to only the fields
// we actually use. Full schema:
// https://postmarkapp.com/developer/user-guide/inbound/parse-an-email
const PostmarkInboundSchema = z.object({
  MessageID: z.string().min(1),
  From: z.string().email().or(z.string()),
  FromName: z.string().optional(),
  Subject: z.string().default(''),
  TextBody: z.string().default(''),
  HtmlBody: z.string().optional(),
  Date: z.string().optional(),
  /** Full list of recipients Postmark parsed out of the To header.
   *  We use the first entry that matches our domain. */
  ToFull: z
    .array(
      z.object({
        Email: z.string(),
        Name: z.string().optional(),
        MailboxHash: z.string().optional(),
      }),
    )
    .default([]),
  To: z.string().optional(),
});

const FORWARD_DOMAIN = 'phcopilot.app';

function verifyBasicAuth(req: NextRequest): boolean {
  const user = process.env.POSTMARK_INBOUND_USER;
  const pass = process.env.POSTMARK_INBOUND_PASS;
  // If either env is missing, refuse — safer than accidentally being
  // open in an environment where the creds haven't been provisioned.
  if (!user || !pass) return false;

  const header = req.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return false;

  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const idx = decoded.indexOf(':');
  if (idx < 0) return false;
  const suppliedUser = decoded.slice(0, idx);
  const suppliedPass = decoded.slice(idx + 1);

  // Constant-time compare via Buffer to avoid timing leaks on the
  // secret. Length mismatch short-circuits (also non-secret info).
  if (suppliedUser.length !== user.length || suppliedPass.length !== pass.length) return false;
  return (
    Buffer.compare(Buffer.from(suppliedUser), Buffer.from(user)) === 0 &&
    Buffer.compare(Buffer.from(suppliedPass), Buffer.from(pass)) === 0
  );
}

/** Pull the local part out of `{slug}@phcopilot.app`. Returns null on
 *  any other domain — Postmark shouldn't route foreign mail to us,
 *  but we defend anyway in case the inbound server gets misconfigured. */
function extractSlug(address: string): string | null {
  const at = address.lastIndexOf('@');
  if (at < 0) return null;
  const local = address.slice(0, at).toLowerCase();
  const domain = address.slice(at + 1).toLowerCase();
  if (domain !== FORWARD_DOMAIN) return null;
  // Strip Postmark's optional +hash suffix — some users have Gmail's
  // plus-addressing turned on.
  const plus = local.indexOf('+');
  return plus >= 0 ? local.slice(0, plus) : local;
}

export async function POST(req: NextRequest) {
  if (!verifyBasicAuth(req)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const parsed = PostmarkInboundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'unexpected payload' }, { status: 400 });
  }
  const p = parsed.data;
  const db = getDb();

  // Idempotency — Postmark retries for up to 3 days on non-2xx. A
  // second delivery of the same MessageID silently returns 200.
  const existing = await db
    .select({ id: emailEvents.id })
    .from(emailEvents)
    .where(eq(emailEvents.messageId, p.MessageID))
    .limit(1);
  if (existing[0]) {
    return NextResponse.json({ ok: true, dedup: true });
  }

  // Resolve slug → deviceId.
  const recipient = p.ToFull[0]?.Email ?? p.To ?? '';
  const slug = extractSlug(recipient);
  if (!slug) {
    await db.insert(emailEvents).values({
      messageId: p.MessageID,
      toSlug: recipient,
      fromEmail: typeof p.From === 'string' ? p.From : String(p.From),
      subject: p.Subject,
      status: 'unmatched',
      detail: { reason: 'bad recipient domain' },
      rawText: p.TextBody,
    });
    return NextResponse.json({ ok: true });
  }

  const forward = await db
    .select({ deviceId: linkedEmailForwards.deviceId })
    .from(linkedEmailForwards)
    .where(eq(linkedEmailForwards.slug, slug))
    .limit(1);
  const deviceId = forward[0]?.deviceId ?? null;

  if (!deviceId) {
    await db.insert(emailEvents).values({
      messageId: p.MessageID,
      toSlug: slug,
      fromEmail: typeof p.From === 'string' ? p.From : String(p.From),
      subject: p.Subject,
      status: 'unmatched',
      detail: { reason: 'unknown slug' },
      rawText: p.TextBody,
    });
    return NextResponse.json({ ok: true });
  }

  // Dispatch through the parser framework.
  const outcome = parseInboundEmail({
    fromEmail: typeof p.From === 'string' ? p.From : String(p.From),
    fromName: p.FromName,
    subject: p.Subject,
    text: p.TextBody,
    html: p.HtmlBody,
    receivedAt: p.Date ? new Date(p.Date) : new Date(),
  });

  // Log + act.
  const baseEvent = {
    messageId: p.MessageID,
    toSlug: slug,
    deviceId,
    fromEmail: typeof p.From === 'string' ? p.From : String(p.From),
    subject: p.Subject,
    rawText: p.TextBody,
  };

  try {
    if (outcome.kind === 'balance') {
      const [eventRow] = await db
        .insert(emailEvents)
        .values({
          ...baseEvent,
          status: 'parsed',
          programId: outcome.programId,
          detail: { balance: outcome.balance, snapshotAt: outcome.snapshotAt.toISOString() },
        })
        .returning({ id: emailEvents.id });

      await db.insert(balanceUpdates).values({
        deviceId,
        programId: outcome.programId,
        balance: String(outcome.balance),
        source: 'forward',
        sourceEventId: eventRow?.id,
      });
    } else if (outcome.kind === 'gmail_verification') {
      let confirmed = false;
      if (outcome.confirmUrl) {
        confirmed = await confirmGmailForwardingUrl(outcome.confirmUrl);
      }
      await db.insert(emailEvents).values({
        ...baseEvent,
        status: 'ignored',
        detail: {
          reason: 'gmail_verification',
          confirmed,
          code: outcome.code,
          confirmUrl: outcome.confirmUrl,
        },
      });
    } else if (outcome.kind === 'ignored') {
      await db.insert(emailEvents).values({
        ...baseEvent,
        status: 'ignored',
        detail: { reason: outcome.reason },
      });
    } else {
      await db.insert(emailEvents).values({
        ...baseEvent,
        status: 'ignored',
        detail: { reason: 'no parser matched sender' },
      });
    }
  } catch (err) {
    await db.insert(emailEvents).values({
      ...baseEvent,
      status: 'error',
      detail: { error: String(err) },
    });
  }

  return NextResponse.json({ ok: true });
}
