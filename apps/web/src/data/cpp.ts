// Cents-per-point (AUD) reference table — conservative mid-range estimates
// from Point Hacks redemption guides and community valuations.
//
// Sourced from `points-deals/lib/cpp.ts`. Extracted standalone (no Bonus /
// LoyaltyProgram type imports) so the data is decoupled from the upstream
// repo's type system.
//
// Used by `buildAskContext()` to inject grounded points-to-dollar values
// into the Copilot prompt — answers can say "≈ 6¢ per point" instead of
// guessing.
//
// These are ESTIMATES, never financial advice. The Copilot system prompt's
// "never fabricate" rule applies — values here are the only allowed source
// when quoting CPP figures.

export type LoyaltyProgram =
  | 'qantas'
  | 'velocity'
  | 'kris-flyer'
  | 'asia-miles'
  | 'flybuys'
  | 'everyday-rewards'
  | 'marriott-bonvoy'
  | 'hilton-honors'
  | 'ihg-one'
  | 'accor-all';

/** AUD cents per point — conservative mid-range. */
export const CPP: Record<LoyaltyProgram, number> = {
  qantas: 1.8,
  velocity: 1.6,
  'kris-flyer': 1.8,
  'asia-miles': 1.5,
  flybuys: 0.5,
  'everyday-rewards': 1.0,
  'marriott-bonvoy': 0.8,
  'hilton-honors': 0.45,
  'ihg-one': 0.6,
  'accor-all': 0.5,
};

/** Human-readable program names for Copilot to use in answers. */
export const PROGRAM_LABEL: Record<LoyaltyProgram, string> = {
  qantas: 'Qantas Frequent Flyer',
  velocity: 'Velocity Frequent Flyer',
  'kris-flyer': 'Singapore KrisFlyer',
  'asia-miles': 'Cathay Asia Miles',
  flybuys: 'Flybuys',
  'everyday-rewards': 'Woolworths Everyday Rewards',
  'marriott-bonvoy': 'Marriott Bonvoy',
  'hilton-honors': 'Hilton Honors',
  'ihg-one': 'IHG One Rewards',
  'accor-all': 'Accor ALL',
};
