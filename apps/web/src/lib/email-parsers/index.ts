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
  const from = email.fromEmail.toLowerCase();

  // Gmail verification always wins if it looks like one — Google
  // sends these from forwarding-noreply@google.com and they're
  // short-lived (~7 days), so we handle them ahead of anything else.
  if (from.endsWith('@google.com') || from === 'forwarding-noreply@google.com') {
    const verified = parseGmailVerification(email);
    if (verified) return verified;
  }

  // Match by sender domain — cheapest predicate, and most robust
  // to per-program template drift.
  if (from.endsWith('@qantas.com') || from.endsWith('@qantasloyalty.com')) {
    return parseQantas(email);
  }
  if (
    from.endsWith('@velocityfrequentflyer.com') ||
    from.endsWith('@virginaustralia.com') ||
    from.endsWith('@members.velocityfrequentflyer.com')
  ) {
    return parseVelocity(email);
  }

  return { kind: 'unknown' };
}
