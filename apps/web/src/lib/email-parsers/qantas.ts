// Qantas Frequent Flyer balance parser.
//
// STATUS: validated against a real forwarded Qantas monthly-newsletter
// email (2026-08-24). Ready for production. Fixtures TBA — the seed
// fixture is preserved in email_events.raw_text from row received_at
// 2026-08-24T14:20:17Z; port to __fixtures__/qantas/ when adding
// regression tests.
//
// Known senders (add as we see them in the wild):
//   qff@qantasloyalty.com   — monthly points statement
//   qantasff@e.qantas.com   — monthly newsletter incl. balance
//   noreply@qantas.com      — activity / promo emails (should skip)
//   qff@member.qantas.com   — occasional "your balance" nudge
//
// Content shapes historically observed — parser tries them in order,
// first match wins. The number can be comma-separated or bare digits;
// max realistic AU balance is under 10M points, so a 4–8 digit run is
// the widest window we accept:
//   1. "Qantas Points  312,023"                     ← current newsletter template
//   2. "Your current points balance: 186,400"       ← statement template
//   3. "You have 186,400 Qantas Points"             ← older statement
//   4. "balance: 186,400 points"                    ← fallback

import type { ParsedInboundEmail, ParserOutcome } from './index';

const BALANCE_REGEXES: RegExp[] = [
  // 2026 monthly newsletter — header panel: "Qantas Points  312,023".
  // We anchor on "Qantas Points" followed by whitespace + a comma-
  // formatted or bare number. Case-insensitive.
  /qantas\s+points\s+([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})\b/i,
  /current\s+points?\s+balance[^0-9]{0,20}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})/i,
  /you\s+have\s+([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})\s+qantas\s+points/i,
  /balance[^0-9]{0,10}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})\s+points/i,
];

const SNAPSHOT_REGEXES: RegExp[] = [
  // Newsletter template: "shown are as at 11-Aug-2026" (hyphen-delimited).
  // Statement template: "Statement as at 15 March 2026" (space-delimited).
  // Accept either separator — we normalise to spaces before passing to
  // `new Date()`, which parses both `11 Aug 2026` and `11-Aug-2026`
  // reliably.
  /statement\s+as\s+at\s+(\d{1,2}[-\s]\w+[-\s]\d{4})/i,
  /shown\s+are\s+as\s+at\s+(\d{1,2}[-\s]\w+[-\s]\d{4})/i,
  /as\s+at\s+(\d{1,2}[-\s]\w+[-\s]\d{4})/i,
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
      // Normalise `11-Aug-2026` → `11 Aug 2026` so `new Date()` parses.
      const parsed = new Date(m[1].replace(/-/g, ' '));
      if (!Number.isNaN(parsed.getTime())) {
        snapshotAt = parsed;
        break;
      }
    }
  }

  // Secondary fields — best-effort. All three come from the newsletter
  // header panel that also holds the points figure. Extract each with
  // its own regex; a miss on any one is fine (the field stays undefined
  // and the DB column stays null).
  //
  // Status Credits example: "Status Credits 0" — same shape as the
  // Qantas Points header line. Zero is a valid value; we don't want to
  // reject-parse it, so we accept 0+.
  const statusMatch = body.match(/status\s+credits\s+([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)/i);
  const statusCredits = statusMatch?.[1]
    ? parseInt(statusMatch[1].replace(/,/g, ''), 10)
    : undefined;

  // Tier: appears as a standalone line "BRONZE" / "SILVER" / … in the
  // newsletter header. Anchor on the tier vocab so we don't false-
  // positive on generic uppercase words elsewhere in the body.
  const tierMatch = body.match(/\b(BRONZE|SILVER|GOLD|PLATINUM ONE|PLATINUM)\b/);
  const tier = tierMatch?.[1] ? tierMatch[1].replace(/\s+/g, '_') : undefined;

  // Member ID: "Frequent Flyer Number 1919026219". Qantas member
  // numbers are 10 digits, but we accept 8–12 to be defensive to
  // future template drift.
  const memberMatch = body.match(/frequent\s+flyer\s+number\s+([0-9]{8,12})/i);
  const memberId = memberMatch?.[1];

  return {
    kind: 'balance',
    programId: 'qantas',
    balance,
    snapshotAt,
    ...(Number.isFinite(statusCredits) ? { statusCredits: statusCredits as number } : {}),
    ...(tier ? { tier } : {}),
    ...(memberId ? { memberId } : {}),
  };
}
