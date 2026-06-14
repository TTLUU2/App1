import type {
  Card,
  FilterOption,
  PerkOption,
  SortOption,
  BankOption,
  IncomeOption,
  CardTypeOption,
} from '../types';
import { rateToRatio } from '../utils/cardUtils';

export interface FeeFilterOption {
  label: string;
  value: number;
}

/** Program filter: only Qantas, Velocity, AMEX, and All (All last). */
export const PROGRAM_FILTER_OPTIONS: FilterOption[] = [
  {
    label: 'Qantas',
    value: 'Qantas',
    img: 'https://pointhacks-spa-tools.fly.dev/images/programs-small/qantas.png',
  },
  {
    label: 'Velocity',
    value: 'Velocity',
    img: 'https://pointhacks-spa-tools.fly.dev/images/programs-small/velocity.png',
  },
  {
    label: 'AMEX',
    value: 'AMEX',
    img: 'https://pointhacks-spa-tools.fly.dev/images/programs-small/amex-mr.png',
  },
  {
    label: 'All',
    value: 'All',
    img: 'https://pointhacks-spa-tools.fly.dev/images/icons/all-programs.png',
  },
];

/** Map filter value to the currency names that should match in conversionRates / transfer partners. */
const TRANSFER_CURRENCY_KEYWORDS: Record<string, string[]> = {
  Qantas: ['qantas'],
  Velocity: ['velocity', 'virgin'],
};

/** Check if a card can transfer to the filtered currency via PocketBase conversionRates. */
function canTransferTo(card: Card, filterValue: string): boolean {
  const keywords = TRANSFER_CURRENCY_KEYWORDS[filterValue];
  if (!keywords) return false;

  if (card.conversionRates?.length) {
    return card.conversionRates.some((cr) => {
      const n = cr.name.toLowerCase();
      return keywords.some((kw) => n.includes(kw));
    });
  }

  return false;
}

/**
 * Get the transfer ratio for a card to the target currency, or null if no transfer path exists.
 * PocketBase rate is a multiplier (e.g. 0.5 = 1 source → 0.5 dest), convert to divisor (1/rate).
 */
export function getTransferRatio(card: Card, targetCurrency: string): number | null {
  const keywords = TRANSFER_CURRENCY_KEYWORDS[targetCurrency];
  if (!keywords) return null;

  if (card.conversionRates?.length) {
    const match = card.conversionRates.find((cr) => {
      const n = cr.name.toLowerCase();
      return keywords.some((kw) => n.includes(kw));
    });
    if (match && match.rate > 0) return rateToRatio(match.rate);
  }

  return null;
}

/**
 * Get the best (lowest) transfer ratio across all frequent flyer destinations for a card.
 * Returns the ratio divisor, or null if the card earns directly into a FF program (no conversion needed).
 * Used to normalize transferable reward points (MR, Amplify, etc.) for fair ranking against direct FF cards.
 */
export function getBestTransferRatio(card: Card): number | null {
  if (!card.conversionRates?.length) return null;
  const ffRates = card.conversionRates.filter(
    (cr) => cr.destinationType === 'frequent_flyer' && cr.rate > 0,
  );
  if (ffRates.length === 0) return null;
  // Highest rate = best value (lowest divisor ratio)
  const best = ffRates.reduce((a, b) => (a.rate > b.rate ? a : b));
  return rateToRatio(best.rate);
}

/** True if card's program or frequentFlyerProgram matches the filter value, OR if the card can transfer to it. */
export function cardMatchesProgramFilter(card: Card, filterValue: string): boolean {
  if (filterValue === 'All') return true;
  const p = (card.program ?? '').toLowerCase();
  const f = (card.frequentFlyerProgram ?? '').toLowerCase();
  const combined = `${p} ${f}`;

  // Direct match: card earns in the filtered currency
  if (filterValue === 'Qantas' && combined.includes('qantas')) return true;
  if (filterValue === 'Velocity' && (combined.includes('velocity') || combined.includes('virgin')))
    return true;
  if (
    filterValue === 'AMEX' &&
    (combined.includes('amex') ||
      combined.includes('american express') ||
      combined.includes('membership rewards'))
  )
    return true;

  // Transfer match: card can transfer points to the filtered currency
  if (canTransferTo(card, filterValue)) return true;

  return false;
}

export const PERK_OPTIONS: PerkOption[] = [
  {
    id: 'lounge',
    name: 'Lounge Access',
    icon: 'https://pointhacks-spa-tools.fly.dev/images/perks/lounge-access.png',
  },
  {
    id: 'credit',
    name: 'Travel Credit',
    icon: 'https://pointhacks-spa-tools.fly.dev/images/perks/travel-credit.png',
  },
  {
    id: 'insurance',
    name: 'Travel Insurance',
    icon: 'https://pointhacks-spa-tools.fly.dev/images/perks/travel-insurance.png',
  },
  {
    id: 'no_intl_fees',
    name: 'No International Transaction Fees',
    icon: 'https://pointhacks-spa-tools.fly.dev/images/perks/no-international-fees.png',
  },
];

export const BONUS_FILTER_OPTIONS = [
  { label: '50k+', value: 50000 },
  { label: '75k+', value: 75000 },
  { label: '100k+', value: 100000 },
  { label: '125k+', value: 125000 },
];

export const FEE_FILTER_OPTIONS: FeeFilterOption[] = [
  { label: 'Up to $200', value: 200 },
  { label: 'Up to $350', value: 350 },
  { label: 'Up to $500', value: 500 },
  { label: 'Any', value: 2000 },
];

export const SORT_OPTIONS: SortOption[] = [
  {
    label: 'Highest Points',
    value: 'points_high',
    img: 'https://pointhacks-spa-tools.fly.dev/images/icons/highest-points.png',
  },
  {
    label: 'Lowest Fee',
    value: 'fee_low',
    img: 'https://pointhacks-spa-tools.fly.dev/images/icons/lowest-fee.png',
  },
  {
    label: 'Highest Earn Rate',
    value: 'earn_high',
    img: 'https://pointhacks-spa-tools.fly.dev/images/icons/highest-earn-rate.png',
  },
];

export const INCOME_OPTIONS: IncomeOption[] = [
  { label: 'All', value: Infinity },
  { label: '<35k', value: 34999 },
  { label: '35k+', value: 74999 },
  { label: '75k+', value: 199999 },
  { label: '200k+', value: 200000 },
];

// St.George group banks share eligibility rules — holding a card with any excludes bonus offers from all.
const STGEORGE_GROUP_PROVIDERS = ['St.George', 'BankSA', 'Bank of Melbourne'];

export const BANK_OPTIONS: BankOption[] = [
  {
    name: 'American Express',
    logo: 'https://pointhacks-spa-tools.fly.dev/images/banks/amex.png',
    exclusion: 'Within 18 Months',
    provider: 'Amex',
  },
  {
    name: 'ANZ',
    logo: 'https://pointhacks-spa-tools.fly.dev/images/banks/anz.png',
    exclusion: 'Within 24 Months',
  },
  {
    name: 'Bank of Melbourne',
    logo: 'https://pointhacks-spa-tools.fly.dev/images/banks/bank-of-melbourne.png',
    exclusion: 'Within 24 Months',
    provider: 'Bank of Melbourne',
    excludeProviders: STGEORGE_GROUP_PROVIDERS,
  },
  {
    name: 'BankSA',
    logo: 'https://pointhacks-spa-tools.fly.dev/images/banks/banksa.png',
    exclusion: 'Within 24 Months',
    provider: 'BankSA',
    excludeProviders: STGEORGE_GROUP_PROVIDERS,
  },
  {
    name: 'HSBC',
    logo: 'https://pointhacks-spa-tools.fly.dev/images/banks/hsbc.png',
    exclusion: 'Within 18 Months',
  },
  {
    name: 'MyCard',
    logo: 'https://pointhacks-spa-tools.fly.dev/images/banks/mycard.png',
    exclusion: 'Currently Hold',
    provider: 'MyCard',
  },
  {
    name: 'NAB',
    logo: 'https://pointhacks-spa-tools.fly.dev/images/banks/nab.png',
    exclusion: 'Within 24 Months',
    provider: 'NAB',
  },
  {
    name: 'Qantas Money',
    logo: 'https://pointhacks-spa-tools.fly.dev/images/banks/qantas-money.png',
    exclusion: 'Currently Hold',
    provider: 'Qantas Money',
  },
  {
    name: 'St.George',
    logo: 'https://pointhacks-spa-tools.fly.dev/images/banks/st-george.png',
    exclusion: 'Within 24 Months',
    excludeProviders: STGEORGE_GROUP_PROVIDERS,
  },
  {
    name: 'Westpac',
    logo: 'https://pointhacks-spa-tools.fly.dev/images/banks/westpac.png',
    exclusion: 'Within 24 Months',
    provider: 'Westpac',
  },
];

export const CARD_TYPE_OPTIONS: CardTypeOption[] = [
  {
    label: 'Personal',
    value: 'Personal',
    img: 'https://pointhacks-spa-tools.fly.dev/images/icons/personal.png',
  },
  {
    label: 'Business',
    value: 'Business',
    img: 'https://pointhacks-spa-tools.fly.dev/images/icons/business.png',
  },
  {
    label: 'All',
    value: 'All',
    img: 'https://pointhacks-spa-tools.fly.dev/images/icons/all-card-types.png',
  },
];
