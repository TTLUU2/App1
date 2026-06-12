'use client';

import { useState, useMemo } from 'react';
import type { Card, BonusType, SortType } from '../types';
import {
  BANK_OPTIONS,
  PROGRAM_FILTER_OPTIONS,
  cardMatchesProgramFilter,
  getTransferRatio,
  getBestTransferRatio,
} from '../data/filterOptions';
import { parseIncome } from '../utils/cardUtils';

export interface CardFiltersState {
  selectedPrograms: Set<string>;
  setSelectedPrograms: React.Dispatch<React.SetStateAction<Set<string>>>;
  programFilterOptions: { label: string; value: string; img?: string }[];
  minBonusPoints: number;
  setMinBonusPoints: (v: number) => void;
  minEarnRate: number;
  setMinEarnRate: (v: number) => void;
  bonusType: BonusType;
  setBonusType: (v: BonusType) => void;
  selectedPerks: Set<string>;
  togglePerk: (id: string) => void;
  userIncome: number;
  setUserIncome: (v: number) => void;
  heldBanks: Set<string>;
  toggleHeldBank: (name: string) => void;
  selectedFee: number;
  setSelectedFee: (v: number) => void;
  selectedSort: SortType;
  setSelectedSort: (v: SortType) => void;
  selectedCardType: Set<string>;
  setSelectedCardType: React.Dispatch<React.SetStateAction<Set<string>>>;
  filteredCards: Card[];
  getCardCountForOption: (step: number, optionValue: string | number) => number;
  performResetValues: () => void;
}

export function useCardFilters(cards: Card[]): CardFiltersState {
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set(['All']));
  const [minBonusPoints, setMinBonusPoints] = useState(0);
  const [minEarnRate, setMinEarnRate] = useState(0);
  const [bonusType, setBonusType] = useState<BonusType>('total');
  const [selectedPerks, setSelectedPerks] = useState<Set<string>>(new Set());
  const [userIncome, setUserIncome] = useState<number>(Infinity);
  const [heldBanks, setHeldBanks] = useState<Set<string>>(new Set());
  const [selectedFee, setSelectedFee] = useState(2000);
  const [selectedSort, setSelectedSort] = useState<SortType>('points_high');
  const [selectedCardType, setSelectedCardType] = useState<Set<string>>(new Set());

  const togglePerk = (perkId: string) => {
    setSelectedPerks((prev) => {
      const next = new Set(prev);
      if (next.has(perkId)) next.delete(perkId);
      else next.add(perkId);
      return next;
    });
  };

  const toggleHeldBank = (bankName: string) => {
    setHeldBanks((prev) => {
      const next = new Set(prev);
      const bankObj = BANK_OPTIONS.find((b) => b.name === bankName);
      // Find all banks in the same exclusion group
      const groupNames = bankObj?.excludeProviders
        ? BANK_OPTIONS.filter((b) => b.excludeProviders === bankObj.excludeProviders).map(
            (b) => b.name,
          )
        : [bankName];
      const isRemoving = next.has(bankName);
      for (const name of groupNames) {
        if (isRemoving) next.delete(name);
        else next.add(name);
      }
      return next;
    });
  };

  const getCardCountForOption = (step: number, optionValue: string | number): number => {
    return cards.filter((card) => {
      const cardMinIncome = parseIncome(card.extraInfo['Minimum Income']);
      if (userIncome !== Infinity && cardMinIncome > userIncome) return false;

      if (selectedPerks.size > 0) {
        if (selectedPerks.has('lounge') && !card.extraInfo['Lounge Access']) return false;
        if (
          selectedPerks.has('credit') &&
          !(card.specialFeatureTitle === 'Travel Credit' || card.extraInfo['Travel Credit'])
        )
          return false;
        if (selectedPerks.has('insurance') && !card.extraInfo['Insurance']) return false;
        if (selectedPerks.has('no_intl_fees') && card.extraInfo['Intl Transaction Fee'] !== 'No')
          return false;
      }

      if (heldBanks.size > 0) {
        const isExcluded = Array.from(heldBanks).some((bankName) => {
          const bankObj = BANK_OPTIONS.find((b) => b.name === bankName);
          if (!bankObj?.exclusion) return false;
          if (bankObj?.excludeProviders?.includes(card.provider)) return true;
          if (bankObj?.provider === card.provider) return true;
          return card.provider === bankName;
        });
        if (isExcluded) return false;
      }

      const cardBonus =
        bonusType === 'total' ? card.bonusPoints : card.firstYearBonusPoints || card.bonusPoints;
      if (cardBonus < minBonusPoints) return false;

      const effectiveEarnNum = card.earnToBonusRatio
        ? card.earnRateNum / card.earnToBonusRatio
        : card.earnRateNum;
      if (effectiveEarnNum < minEarnRate) return false;

      let testPrograms = selectedPrograms;
      let testCardType = selectedCardType;
      let testFee = selectedFee;

      if (step === 0) {
        const val = String(optionValue);
        testPrograms = val === 'All' ? new Set(['All']) : new Set([val]);
        testCardType = new Set(['All']);
        testFee = 2000;
      } else if (step === 1) {
        const val = String(optionValue);
        testCardType = new Set([val]);
        if (val === 'All') testCardType = new Set(['All']);
        testFee = 2000;
      } else if (step === 2) {
        testFee = Number(optionValue);
      }

      const matchesProgram =
        testPrograms.has('All') ||
        Array.from(testPrograms).some((v) => cardMatchesProgramFilter(card, v));
      if (!matchesProgram) return false;

      const matchesCardType =
        testCardType.size === 0 || testCardType.has('All') || testCardType.has(card.cardType);
      if (!matchesCardType) return false;

      if (card.annualFeeNum > testFee) return false;

      return true;
    }).length;
  };

  const programFilterOptions = PROGRAM_FILTER_OPTIONS;

  const filteredCards = useMemo<Card[]>(() => {
    const filtered = cards.filter((card) => {
      const matchesProgram =
        selectedPrograms.has('All') ||
        Array.from(selectedPrograms).some((v) => cardMatchesProgramFilter(card, v));

      const cardBonus =
        bonusType === 'total' ? card.bonusPoints : card.firstYearBonusPoints || card.bonusPoints;
      const matchesBonus = cardBonus >= minBonusPoints;
      const matchesFee = card.annualFeeNum <= selectedFee;
      const effectiveEarnNum = card.earnToBonusRatio
        ? card.earnRateNum / card.earnToBonusRatio
        : card.earnRateNum;
      const matchesEarnRate = effectiveEarnNum >= minEarnRate;
      const matchesCardType =
        selectedCardType.size === 0 ||
        selectedCardType.has('All') ||
        selectedCardType.has(card.cardType);

      let matchesPerks = true;
      if (selectedPerks.size > 0) {
        if (selectedPerks.has('lounge') && !card.extraInfo['Lounge Access']) matchesPerks = false;
        if (
          selectedPerks.has('credit') &&
          !(card.specialFeatureTitle === 'Travel Credit' || card.extraInfo['Travel Credit'])
        )
          matchesPerks = false;
        if (selectedPerks.has('insurance') && !card.extraInfo['Insurance']) matchesPerks = false;
        if (selectedPerks.has('no_intl_fees') && card.extraInfo['Intl Transaction Fee'] !== 'No')
          matchesPerks = false;
      }

      const cardMinIncome = parseIncome(card.extraInfo['Minimum Income']);
      const matchesIncome = userIncome === Infinity || cardMinIncome <= userIncome;

      let matchesBankExclusion = true;
      if (heldBanks.size > 0) {
        const isExcluded = Array.from(heldBanks).some((bankName) => {
          const bankObj = BANK_OPTIONS.find((b) => b.name === bankName);
          if (!bankObj?.exclusion) return false;
          if (bankObj?.excludeProviders?.includes(card.provider)) return true;
          if (bankObj?.provider === card.provider) return true;
          return card.provider === bankName;
        });
        if (isExcluded) matchesBankExclusion = false;
      }

      return (
        matchesProgram &&
        matchesBonus &&
        matchesFee &&
        matchesEarnRate &&
        matchesPerks &&
        matchesIncome &&
        matchesBankExclusion &&
        matchesCardType
      );
    });

    // When a single currency filter is active, sort by converted points in that currency
    const activeCurrencyFilter =
      selectedPrograms.size === 1 && !selectedPrograms.has('All') ? [...selectedPrograms][0] : null;

    // Cards with frequentFlyerProgram have bonus points already in FF currency (auto-transfer),
    // even though their earn rate may be in a flexible bank currency that needs conversion.
    const bonusIsFF = (card: Card) => !!card.frequentFlyerProgram && !!card.conversionRates?.length;

    if (selectedSort === 'points_high') {
      filtered.sort((a, b) => {
        const effective = (card: Card) => {
          if (bonusIsFF(card)) return card.bonusPoints;
          if (activeCurrencyFilter) {
            const ratio = getTransferRatio(card, activeCurrencyFilter);
            if (ratio) return card.bonusPoints / ratio;
          }
          const bestRatio = getBestTransferRatio(card);
          if (bestRatio) return card.bonusPoints / bestRatio;
          return card.bonusPoints;
        };
        return effective(b) - effective(a);
      });
    } else if (selectedSort === 'fee_low') {
      filtered.sort((a, b) => a.annualFeeNum - b.annualFeeNum);
    } else if (selectedSort === 'earn_high') {
      filtered.sort((a, b) => {
        const effective = (card: Card) => {
          const baseRate = card.earnRateNum / (card.earnToBonusRatio || 1);
          // If earnToBonusRatio was applied, rate is already in FF terms — don't convert again
          if (card.earnToBonusRatio) return baseRate;
          if (activeCurrencyFilter) {
            const ratio = getTransferRatio(card, activeCurrencyFilter);
            if (ratio) return baseRate / ratio;
          }
          const bestRatio = getBestTransferRatio(card);
          if (bestRatio) return baseRate / bestRatio;
          return baseRate;
        };
        return effective(b) - effective(a);
      });
    }

    return filtered;
  }, [
    cards,
    selectedPrograms,
    minBonusPoints,
    bonusType,
    selectedFee,
    selectedSort,
    minEarnRate,
    selectedPerks,
    userIncome,
    heldBanks,
    selectedCardType,
  ]);

  const performResetValues = () => {
    setSelectedPrograms(new Set(['All']));
    setMinBonusPoints(0);
    setSelectedFee(2000);
    setSelectedSort('points_high');
    setMinEarnRate(0);
    setSelectedPerks(new Set());
    setUserIncome(Infinity);
    setHeldBanks(new Set());
    setSelectedCardType(new Set());
  };

  return {
    selectedPrograms,
    setSelectedPrograms,
    programFilterOptions,
    minBonusPoints,
    setMinBonusPoints,
    minEarnRate,
    setMinEarnRate,
    bonusType,
    setBonusType,
    selectedPerks,
    togglePerk,
    userIncome,
    setUserIncome,
    heldBanks,
    toggleHeldBank,
    selectedFee,
    setSelectedFee,
    selectedSort,
    setSelectedSort,
    selectedCardType,
    setSelectedCardType,
    filteredCards,
    getCardCountForOption,
    performResetValues,
  };
}
