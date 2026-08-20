// Qantas Frequent Flyer balance parser.
//
// STATUS: framework in place, actual balance-extraction regex is a TODO
// pending a real fixture. Do NOT ship this to prod until at least one
// real Qantas balance email has been pasted into
// apps/web/src/lib/email-parsers/__fixtures__/qantas/*.eml and the
// regexes below have been validated against it.
//
// Known senders (add as we see them in the wild):
//   qff@qantasloyalty.com   — monthly points statement
//   noreply@qantas.com      — activity / promo emails (should skip)
//   qff@member.qantas.com   — occasional "your balance" nudge
//
// Two content shapes historically observed:
//   1. "Your current points balance: 186,400"     ← preferred
//   2. "You have 186,400 Qantas Points"           ← older template
// Either shape works; the parser tries them in order and takes the
// first match. The number can be comma-separated or bare digits; the
// max realistic AU balance is under 10M points, so a 4–8 digit run
// is the widest window we accept.

import type { ParsedInboundEmail, ParserOutcome } from './index';

const BALANCE_REGEXES: RegExp[] = [
  /current\s+points?\s+balance[^0-9]{0,20}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})/i,
  /you\s+have\s+([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})\s+qantas\s+points/i,
  /balance[^0-9]{0,10}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})\s+points/i,
];

const SNAPSHOT_REGEXES: RegExp[] = [
  /statement\s+as\s+at\s+(\d{1,2}\s+\w+\s+\d{4})/i,
  /as\s+at\s+(\d{1,2}\s+\w+\s+\d{4})/i,
];

/** Skip these — Qantas sends a lot of non-balance mail from the same
 *  senders. If the subject looks like promo, marketing, or activity
 *  (single transaction), we don't try to parse a balance out of it. */
const IGNORE_SUBJECT_HINTS: RegExp[] = [
  /flight\s+booking/i,
  /boarding\s+pass/i,
  /off\s+your\s+next/i, // "20% off your next…"
  /earn\s+bonus\s+points/i,
  /has\s+been\s+credited/i, // single-transaction credit alert
];

export function parseQantas(email: ParsedInboundEmail): ParserOutcome {
  if (IGNORE_SUBJECT_HINTS.some((rx) => rx.test(email.subject))) {
    return { kind: 'ignored', reason: 'qantas: subject looks non-balance' };
  }

  const body = email.text;
  let match: RegExpMatchArray | null = null;
  for (const rx of BALANCE_REGEXES) {
    match = body.match(rx);
    if (match) break;
  }
  if (!match) {
    return { kind: 'ignored', reason: 'qantas: no balance line found' };
  }

  const raw = match[1];
  if (!raw) return { kind: 'ignored', reason: 'qantas: regex matched but no capture' };
  const balance = parseInt(raw.replace(/,/g, ''), 10);
  if (!Number.isFinite(balance) || balance < 0 || balance > 100_000_000) {
    return { kind: 'ignored', reason: `qantas: implausible balance ${raw}` };
  }

  // Best-effort snapshot date; fall back to the receivedAt timestamp
  // Postmark stamped when it accepted the mail.
  let snapshotAt = email.receivedAt;
  for (const rx of SNAPSHOT_REGEXES) {
    const m = body.match(rx);
    if (m && m[1]) {
      const parsed = new Date(m[1]);
      if (!Number.isNaN(parsed.getTime())) {
        snapshotAt = parsed;
        break;
      }
    }
  }

  return { kind: 'balance', programId: 'qantas', balance, snapshotAt };
}
