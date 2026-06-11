/**
 * Deals domain types — lifted from points-deals/lib/types.ts.
 *
 * Kept standalone (no extra runtime deps) so the deals feature is
 * self-contained and decoupled from the upstream "points-deals" repo.
 * The LoyaltyProgram union intentionally mirrors the one in
 * `data/cpp.ts` — keep both in sync.
 */

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

export type ProgramCategory = 'airline' | 'hotel' | 'retail';

export type DealType = 'gift-card' | 'flyer' | 'hotel';

export type FlyerSubtype = 'earn' | 'burn' | 'buy' | 'status';

export type Bonus =
  | { kind: 'multiplier'; value: number; program: LoyaltyProgram }
  | { kind: 'bonus-points'; value: number; program: LoyaltyProgram }
  | { kind: 'percent-off'; value: number }
  | { kind: 'percent-bonus'; value: number; program: LoyaltyProgram };

interface DealBase {
  id: string;
  title: string;
  description: string;
  programs: LoyaltyProgram[];
  bonus: Bonus;
  startDate: string;
  endDate: string;
  sourceUrl: string;
  terms?: string;
  /** IDs of deals that complement this one. */
  stacksWith?: string[];
}

export type Deal =
  | (DealBase & { dealType: 'gift-card'; retailer: string })
  | (DealBase & { dealType: 'flyer'; flyerSubtype: FlyerSubtype; airlines?: string[] })
  | (DealBase & { dealType: 'hotel'; chain: string });

export type SortKey = 'ending-soonest' | 'newest' | 'biggest-bonus';

export type ExpiringWindow = 'all' | '7d' | '30d';

export interface FilterState {
  dealTypes: DealType[];
  programs: LoyaltyProgram[];
  flyerSubtypes: FlyerSubtype[];
  expiringWindow: ExpiringWindow;
}

export const PROGRAM_LABELS: Record<LoyaltyProgram, string> = {
  qantas: 'Qantas Frequent Flyer',
  velocity: 'Velocity Frequent Flyer',
  'kris-flyer': 'Singapore KrisFlyer',
  'asia-miles': 'Cathay Asia Miles',
  flybuys: 'Flybuys',
  'everyday-rewards': 'Everyday Rewards',
  'marriott-bonvoy': 'Marriott Bonvoy',
  'hilton-honors': 'Hilton Honors',
  'ihg-one': 'IHG One Rewards',
  'accor-all': 'Accor ALL',
};

export const PROGRAM_SHORT: Record<LoyaltyProgram, string> = {
  qantas: 'Qantas',
  velocity: 'Velocity',
  'kris-flyer': 'KrisFlyer',
  'asia-miles': 'Asia Miles',
  flybuys: 'Flybuys',
  'everyday-rewards': 'Everyday Rewards',
  'marriott-bonvoy': 'Marriott',
  'hilton-honors': 'Hilton',
  'ihg-one': 'IHG',
  'accor-all': 'Accor',
};

export const PROGRAM_CATEGORY: Record<LoyaltyProgram, ProgramCategory> = {
  qantas: 'airline',
  velocity: 'airline',
  'kris-flyer': 'airline',
  'asia-miles': 'airline',
  flybuys: 'retail',
  'everyday-rewards': 'retail',
  'marriott-bonvoy': 'hotel',
  'hilton-honors': 'hotel',
  'ihg-one': 'hotel',
  'accor-all': 'hotel',
};

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  'gift-card': 'Gift card',
  flyer: 'Frequent flyer',
  hotel: 'Hotel',
};

export const FLYER_SUBTYPE_LABELS: Record<FlyerSubtype, string> = {
  earn: 'Earn',
  burn: 'Redeem',
  buy: 'Buy points',
  status: 'Status',
};

export const EMPTY_FILTERS: FilterState = {
  dealTypes: [],
  programs: [],
  flyerSubtypes: [],
  expiringWindow: 'all',
};
