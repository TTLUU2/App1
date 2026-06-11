/**
 * Sweet-spot redemption matching.
 *
 * Lifted from points-deals/lib/sweet-spots.ts. Maps a bonus-points deal to
 * the aspirational redemptions it could unlock so users understand the
 * emotional "why" behind the number.
 *
 * Data lives at `data/sweet-spots.json` — hand-curated, ~30 entries.
 * No live award availability; point thresholds + retail value only.
 */
import type { Bonus, LoyaltyProgram } from '@/data/deals-types';
import rawSpots from '@/data/sweet-spots.json';

export interface SweetSpot {
  id: string;
  program: LoyaltyProgram;
  minPoints: number;
  label: string;
  description: string;
  retailValue: number;
  category: 'flight' | 'hotel';
  caveats: string;
}

const ALL_SPOTS: SweetSpot[] = rawSpots as SweetSpot[];

/**
 * Returns sweet spots that the given bonus exactly covers — the deal bonus
 * is >= the spot's minPoints threshold. Sorted best-value-first.
 */
export function matchingSweetSpots(bonus: Bonus): SweetSpot[] {
  if (bonus.kind !== 'bonus-points') return [];

  const { value, program } = bonus;
  return ALL_SPOTS.filter((s) => s.program === program && value >= s.minPoints).sort(
    (a, b) => b.retailValue - a.retailValue,
  );
}

/** Best single sweet spot for a teaser tag, or null. */
export function bestSweetSpot(bonus: Bonus): SweetSpot | null {
  const matches = matchingSweetSpots(bonus);
  return matches[0] ?? null;
}

/** Formats a retail value as "$X,XXX AUD". */
export function formatRetailValue(aud: number): string {
  return `$${aud.toLocaleString('en-AU')} AUD`;
}
