import type { CSSProperties } from 'react';

export interface Card {
  id: number;
  name: string;
  /** Short display name. Some cards in the MOCK_CARDS dataset omit this — fall back to `name`. */
  short_name?: string;
  provider: string;
  frequentFlyerProgram: string;
  program: string;
  cardType: 'Personal' | 'Business';
  applyLink: string;
  bonusPoints: number;
  firstYearBonusPoints: number;
  bonusPointsTotal: string;
  bonusPointsUnit: string;
  earnRate: string;
  earnRateNum: number;
  earnToBonusRatio?: number;
  annualFee: string;
  annualFeeNum: number;
  feeNote?: string;
  offerEndDate: string;
  spendCriteria: string;
  spendYearLabel?: string;
  imageUrl: string;
  specialFeatureTitle: string;
  specialFeatureValue: string;
  bonusSplitLabel2?: string;
  /** HTML blob from CMS — optional in the bundled mock dataset. */
  benefitsHtml?: string;
  travelBenefitsHtml?: string;
  shortDescription?: string;
  extraInfo: Record<string, string>;
  /** Conversion rates from PocketBase when card has card_rewards_program (earn → transfer partners). */
  conversionRates?: Array<{
    name: string;
    rate: number;
    minimumTransfer?: number;
    destinationType: 'frequent_flyer' | 'hotel' | 'retail';
  }>;
}

export interface FilterOption {
  label: string;
  value: string;
  img?: string;
}

export interface PerkOption {
  id: string;
  name: string;
  icon: string;
}

export interface SortOption {
  label: string;
  value: string;
  img: string;
}

export interface BankOption {
  name: string;
  logo: string;
  exclusion?: string;
  provider?: string;
  excludeProviders?: string[];
}

export interface IncomeOption {
  label: string;
  value: number;
}

export interface CardTypeOption {
  label: string;
  value: string;
  img: string;
}

export interface FlyingItem {
  label: string;
  img?: string | null;
  startStyle: CSSProperties;
  endStyle: CSSProperties;
  style: CSSProperties;
}

export interface ProgramBranding {
  logo: string;
  color: string;
}

export type BonusType = 'total' | 'firstYear';

export type SortType = 'points_high' | 'fee_low' | 'earn_high';
