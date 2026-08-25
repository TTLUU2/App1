// Velocity Frequent Flyer balance parser.
//
// STATUS: validated against a real forwarded Velocity marketing email
// (2026-08-25 — "get up to 40% off Velocity Points"). The marketing
// templates carry the current balance in a header panel, so we parse
// them the same as statements. Seed fixture in
// email_events.raw_text row received_at 2026-08-25T01:17:52Z; port
// to __fixtures__/velocity/ when adding regression tests.
//
// Known senders (add as we see them in the wild):
//   velocity@e.velocityfrequentflyer.com       — monthly newsletter + promos
//   memberservices@velocityfrequentflyer.com   — statement
//   noreply@velocityfrequentflyer.com          — activity
//
// Content shapes historically observed — parser tries them in order,
// first match wins:
//   1. "Velocity points\n217,294"               ← 2026 newsletter template
//   2. "Your Points balance: 94,800"
//   3. "You have 94,800 Velocity Points"
//   4. "Current balance    94,800 pts"

import type { ParsedInboundEmail, ParserOutcome } from './index';

const BALANCE_REGEXES: RegExp[] = [
  // 2026 newsletter — "*Velocity points*\n217,294". The asterisks are
  // literal from the plain-text render of the email's <strong> tags;
  // we allow any non-digit prefix so the pattern survives future
  // formatting drift.
  /velocity\s+points[^0-9]{1,40}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})/i,
  /points?\s+balance[^0-9]{0,20}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})/i,
  /you\s+have\s+([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})\s+velocity\s+points/i,
  /current\s+balance[^0-9]{0,10}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})/i,
];

const SNAPSHOT_REGEXES: RegExp[] = [
  // Newsletter: "(as at 18 Aug 2026)" — parenthesised, space-delimited.
  // Statement: "Statement as at 18 August 2026" — full month name.
  /statement\s+as\s+at\s+(\d{1,2}\s+\w+\s+\d{4})/i,
  /\(as\s+at\s+(\d{1,2}\s+\w+\s+\d{4})\)/i,
  /as\s+at\s+(\d{1,2}\s+\w+\s+\d{4})/i,
];

const IGNORE_SUBJECT_HINTS: RegExp[] = [
  /flight\s+booking/i,
  /boarding\s+pass/i,
  /off\s+your\s+next/i,
  /earn\s+bonus\s+points/i,
  /has\s+been\s+credited/i,
];

export function parseVelocity(email: ParsedInboundEmail): ParserOutcome {
  if (IGNORE_SUBJECT_HINTS.some((rx) => rx.test(email.subject))) {
    return { kind: 'ignored', reason: 'velocity: subject looks non-balance' };
  }

  const body = email.text;
  let match: RegExpMatchArray | null = null;
  for (const rx of BALANCE_REGEXES) {
    match = body.match(rx);
    if (match) break;
  }
  if (!match) {
    return { kind: 'ignored', reason: 'velocity: no balance line found' };
  }

  const raw = match[1];
  if (!raw) return { kind: 'ignored', reason: 'velocity: regex matched but no capture' };
  const balance = parseInt(raw.replace(/,/g, ''), 10);
  if (!Number.isFinite(balance) || balance < 0 || balance > 100_000_000) {
    return { kind: 'ignored', reason: `velocity: implausible balance ${raw}` };
  }

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

  // Optional extras — mirror the Qantas parser shape.
  // Tier: standalone line "Red" / "Silver" / "Gold" / "Platinum" in
  // the newsletter header (the row line is "Mr Tran Tin Luu Red" so
  // we anchor on the tier vocab to avoid false-positives on names).
  // /i flag because Velocity renders these mixed-case ("Red"); we
  // uppercase the captured value so the DB / UI compares cleanly.
  const tierMatch = body.match(/\b(RED|SILVER|GOLD|PLATINUM)\b/i);
  const tier = tierMatch?.[1]?.toUpperCase();

  // Member ID: "Membership no.\n1013377655". Velocity IDs are 10
  // digits historically; accept 8–12 for template drift.
  const memberMatch = body.match(/membership\s+no\.?[^0-9]{0,20}([0-9]{8,12})/i);
  const memberId = memberMatch?.[1];

  return {
    kind: 'balance',
    programId: 'velocity',
    balance,
    snapshotAt,
    ...(tier ? { tier } : {}),
    ...(memberId ? { memberId } : {}),
  };
}
