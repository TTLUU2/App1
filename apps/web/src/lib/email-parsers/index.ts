// Email parser framework — shared entry point for both ingress paths
// (Postmark forwarding + future Outlook/Gmail OAuth adapters). An
// adapter normalises its provider-specific payload into a
// `ParsedInboundEmail` and passes it here; the framework matches by
// sender domain, runs the matching parser, and returns a
// `ParserResult`.
//
// Design note: parsers are pure. They never touch the DB, never fire
// side-effects, never depend on request context. That keeps them
// unit-testable against saved email fixtures and lets us re-run the
// parser layer over historical email_events rows to backfill balances
// after a parser fix. The DB writes happen in the calling route
// (/api/inbound-email), not here.

import { parseQantas } from './qantas';
import { parseVelocity } from './velocity';
import { parseGmailVerification } from './gmail-verify';

/** Normalised email shape adapters produce. Provider-specific parsing
 *  of MIME / OAuth payloads happens in each adapter before this. */
export interface ParsedInboundEmail {
  fromEmail: string;
  fromName?: string;
  subject: string;
  /** Plain-text body. Most balance emails have both HTML and text; we
   *  prefer text because it's parser-stable across sender template
   *  refreshes (HTML gets restyled all the time; the text falls out
   *  of the same content model and is more stable). */
  text: string;
  /** HTML body (optional). Only used when the text part is empty or
   *  the parser explicitly needs HTML structure. */
  html?: string;
  receivedAt: Date;
}

export type ParserOutcome =
  | {
      kind: 'balance';
      programId: 'qantas' | 'velocity' | 'amex_mr' | 'krisflyer';
      balance: number;
      /** When the email says the balance was captured — usually the
       *  send date or a "Statement as at DD Month YYYY" line. Falls
       *  back to receivedAt if the parser can't find it. */
      snapshotAt: Date;
    }
  | {
      kind: 'gmail_verification';
      /** The confirmation code Gmail sends. We POST it back to Google
       *  to complete the forwarding-address setup. */
      code: string;
      /** The URL Gmail wants us to confirm at, if present in the mail. */
      confirmUrl?: string;
    }
  | {
      kind: 'ignored';
      reason: string;
    }
  | {
      kind: 'unknown';
    };

/** Route the incoming mail to the right parser. Returns 'unknown' when
 *  no parser claims it (unknown sender, or known sender but the email
 *  doesn't look like a balance — e.g. Qantas marketing). */
export function parseInboundEmail(email: ParsedInboundEmail): ParserOutcome {
  // Manual-forward unwrap. When users use Gmail's "Forward" button, the
  // SMTP `From` becomes their own address and the real sender only
  // survives inside the body preamble. Auto-forwarding filters DO
  // preserve the original `From`, so this path is the manual-forward
  // fallback — supports backfilling old statements without asking users
  // to set up a filter first. If we can pull an original sender out of
  // the body, we swap it in before routing.
  const unwrapped = unwrapForwardedEmail(email) ?? email;

  const from = unwrapped.fromEmail.toLowerCase();

  // Gmail verification always wins if it looks like one — Google
  // sends these from forwarding-noreply@google.com and they're
  // short-lived (~7 days), so we handle them ahead of anything else.
  if (from.endsWith('@google.com') || from === 'forwarding-noreply@google.com') {
    const verified = parseGmailVerification(unwrapped);
    if (verified) return verified;
  }

  // Match by sender domain — cheapest predicate, and most robust
  // to per-program template drift. `.qantas.com` matches both the
  // marketing domain (`e.qantas.com`) and any other subdomain — the
  // parser itself gates on subject to reject promos, so it's safe to
  // hand off any qantas.com sender here.
  if (
    from.endsWith('.qantas.com') ||
    from.endsWith('@qantas.com') ||
    from.endsWith('@qantasloyalty.com')
  ) {
    return parseQantas(unwrapped);
  }
  if (
    from.endsWith('@velocityfrequentflyer.com') ||
    from.endsWith('@virginaustralia.com') ||
    from.endsWith('@members.velocityfrequentflyer.com')
  ) {
    return parseVelocity(unwrapped);
  }

  return { kind: 'unknown' };
}

/** Detects a forwarded email and pulls the original sender + subject out
 *  of the body preamble. Returns null when the email isn't forwarded or
 *  the preamble is unreadable — the caller then falls back to the SMTP
 *  headers as normal. Supports the three formats that account for ~all
 *  desktop/mobile mail clients:
 *    - Gmail:    "---------- Forwarded message ---------"
 *    - Apple:    "Begin forwarded message:"
 *    - Outlook:  "-----Original Message-----"
 *  All three follow the preamble with RFC-822-ish `From:` / `Subject:`
 *  lines the parser can pick up with a simple regex. */
function unwrapForwardedEmail(email: ParsedInboundEmail): ParsedInboundEmail | null {
  const body = email.text;
  const isForwarded =
    /\n-{2,}\s*Forwarded message\s*-{2,}/i.test(body) ||
    /Begin forwarded message:/i.test(body) ||
    /-{2,}\s*Original Message\s*-{2,}/i.test(body) ||
    /^Fwd:/i.test(email.subject) ||
    /^FW:/i.test(email.subject);
  if (!isForwarded) return null;

  // Original From — capture the email inside `<>` if present, else the
  // token that looks like an address. Bounded at 400 chars from the
  // start of the preamble so we don't match a stray `From:` mention
  // deep in the body.
  const fromMatch = body.match(/(?:^|\n)From:\s*([^\n]+)/i);
  if (!fromMatch?.[1]) return null;
  const fromLine = fromMatch[1].trim();
  const angleMatch = fromLine.match(/<([^>]+@[^>]+)>/);
  const bareMatch = fromLine.match(/([\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})/);
  const originalFrom = angleMatch?.[1] ?? bareMatch?.[1];
  if (!originalFrom) return null;

  // Original subject — falls back to email.subject with the Fwd:/FW:
  // prefix stripped if the preamble doesn't carry one.
  const subjectMatch = body.match(/(?:^|\n)Subject:\s*([^\n]+)/i);
  const originalSubject = subjectMatch?.[1]?.trim() ?? email.subject.replace(/^(Fwd|FW):\s*/i, '');

  return {
    ...email,
    fromEmail: originalFrom,
    subject: originalSubject,
    // fromName intentionally cleared — the preamble usually pairs it
    // with the email as `Name <email>`, but pulling the name reliably
    // across all three formats isn't worth the noise; the parsers key
    // off fromEmail and subject, not fromName.
    fromName: undefined,
  };
}
