// Velocity Frequent Flyer balance parser.
//
// STATUS: framework in place, actual balance-extraction regex is a
// TODO pending a real fixture — same protocol as qantas.ts. Do NOT
// ship to prod until validated against a real Velocity balance email
// in apps/web/src/lib/email-parsers/__fixtures__/velocity/*.eml.
//
// Known senders (add as we see them in the wild):
//   memberservices@velocityfrequentflyer.com   — monthly statement
//   noreply@velocityfrequentflyer.com          — activity
//   members@members.velocityfrequentflyer.com  — some marketing
//
// Content shapes observed in older screenshots:
//   1. "Your Points balance: 94,800"
//   2. "You have 94,800 Velocity Points"
//   3. "Current balance    94,800 pts"

import type { ParsedInboundEmail, ParserOutcome } from './index';

const BALANCE_REGEXES: RegExp[] = [
  /points?\s+balance[^0-9]{0,20}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})/i,
  /you\s+have\s+([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})\s+velocity\s+points/i,
  /current\s+balance[^0-9]{0,10}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,8})/i,
];

const SNAPSHOT_REGEXES: RegExp[] = [
  /statement\s+as\s+at\s+(\d{1,2}\s+\w+\s+\d{4})/i,
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

  return { kind: 'balance', programId: 'velocity', balance, snapshotAt };
}
