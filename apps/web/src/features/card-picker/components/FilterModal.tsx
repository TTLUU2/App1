'use client';

import { RefreshCw, X, ArrowUpWideNarrow } from 'lucide-react';
import { pushGtmEvent } from '../lib/gtm-stub';
import type { Card, BonusType, SortType } from '../types';
import { SORT_OPTIONS, CARD_TYPE_OPTIONS } from '../data/filterOptions';
import { BonusSlider } from './filters/BonusSlider';
import { EarnRateSlider } from './filters/EarnRateSlider';
import { FeeSlider } from './filters/FeeSlider';
import { PerksFilter } from './filters/PerksFilter';
import { IncomeSlider } from './filters/IncomeSlider';
import { ExcludedBanksFilter } from './filters/ExcludedBanksFilter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allCards: Card[];
  filteredCards: Card[];
  programFilterOptions: { label: string; value: string; img?: string }[];
  selectedSort: SortType;
  setSelectedSort: (v: SortType) => void;
  selectedCardType: Set<string>;
  setSelectedCardType: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedPrograms: Set<string>;
  setSelectedPrograms: React.Dispatch<React.SetStateAction<Set<string>>>;
  minBonusPoints: number;
  setMinBonusPoints: (v: number) => void;
  bonusType: BonusType;
  setBonusType: (v: BonusType) => void;
  selectedFee: number;
  setSelectedFee: (v: number) => void;
  minEarnRate: number;
  setMinEarnRate: (v: number) => void;
  selectedPerks: Set<string>;
  togglePerk: (id: string) => void;
  userIncome: number;
  setUserIncome: (v: number) => void;
  heldBanks: Set<string>;
  toggleHeldBank: (name: string) => void;
  currentStep: number;
  setCurrentStep: (v: number) => void;
  setMaxStepReached: React.Dispatch<React.SetStateAction<number>>;
  onReset: () => void;
  onShowCards: () => void;
}

export function FilterModal({
  isOpen,
  onClose,
  allCards,
  filteredCards,
  programFilterOptions,
  selectedSort,
  setSelectedSort,
  selectedCardType,
  setSelectedCardType,
  selectedPrograms,
  setSelectedPrograms,
  minBonusPoints,
  setMinBonusPoints,
  bonusType,
  setBonusType,
  selectedFee,
  setSelectedFee,
  minEarnRate,
  setMinEarnRate,
  selectedPerks,
  togglePerk,
  userIncome,
  setUserIncome,
  heldBanks,
  toggleHeldBank,
  currentStep,
  setMaxStepReached,
  onReset,
  onShowCards,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-4 sm:pt-8">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity min-h-full"
        onClick={onClose}
      />
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 relative z-10 flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-900">Filters &amp; Sort</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={onReset}
              className="flex items-center text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reset
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto pr-2 -mr-2 space-y-6">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center">
              <ArrowUpWideNarrow className="w-3 h-3 mr-1" /> Sort Cards By
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedSort(option.value as SortType)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all text-center h-full ${
                    selectedSort === option.value
                      ? 'border-red-600 bg-red-50 text-red-700 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {option.img && (
                    <img src={option.img} className="w-5 h-5 mb-1 object-contain" alt="" />
                  )}
                  <span className="font-semibold text-[10px] leading-tight">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Card Type
            </h4>
            <div className="flex gap-2">
              {CARD_TYPE_OPTIONS.map((option) => {
                const isSelected = selectedCardType.has(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedCardType((prev) => {
                        const next = new Set(prev);
                        if (next.has(option.value)) next.delete(option.value);
                        else next.add(option.value);
                        return next;
                      });
                      pushGtmEvent('card_matcher_filter_applied', { filter_label: option.label });
                    }}
                    className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {option.img && (
                      <img src={option.img} className="w-4 h-4 mr-1.5 object-contain" alt="" />
                    )}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Points Currency
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {programFilterOptions.map((option) => {
                const isSelected =
                  selectedPrograms.has(option.value) ||
                  (option.value === 'All' && selectedPrograms.has('All'));
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      if (option.value === 'All') {
                        setSelectedPrograms(new Set(['All']));
                      } else {
                        setSelectedPrograms((prev) => {
                          const next = new Set(prev);
                          if (next.has('All')) next.delete('All');
                          if (next.has(option.value)) next.delete(option.value);
                          else next.add(option.value);
                          if (next.size === 0) return new Set(['All']);
                          return next;
                        });
                      }
                      pushGtmEvent('card_matcher_filter_applied', { filter_label: option.label });
                      if (currentStep === 0) {
                        setMaxStepReached((prev) => Math.max(prev, 1));
                      }
                    }}
                    className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {option.img && (
                      <img src={option.img} className="w-4 h-4 mr-1.5 object-contain" alt="" />
                    )}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Bonus Points
            </h4>
            <BonusSlider
              value={minBonusPoints}
              onChange={setMinBonusPoints}
              bonusType={bonusType}
              onBonusTypeChange={setBonusType}
            />
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Annual Fee
            </h4>
            <FeeSlider
              value={selectedFee}
              onChange={(val) => {
                setSelectedFee(val);
                if (currentStep === 2) setMaxStepReached((prev) => Math.max(prev, 3));
              }}
              onChangeEnd={(val) => {
                const label = val >= 2000 ? 'Any fee' : `Up to $${val}`;
                pushGtmEvent('card_matcher_filter_applied', { filter_label: label });
              }}
            />
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Earn Rate
            </h4>
            <EarnRateSlider value={minEarnRate} onChange={setMinEarnRate} />
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Card Perks
            </h4>
            <PerksFilter selectedPerks={selectedPerks} togglePerk={togglePerk} />
          </div>

          <IncomeSlider userIncome={userIncome} setUserIncome={setUserIncome} />
          <ExcludedBanksFilter
            cards={allCards}
            heldBanks={heldBanks}
            toggleHeldBank={toggleHeldBank}
          />
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 bg-white">
          <button
            onClick={() => {
              pushGtmEvent('card_matcher_filter_applied', { filter_label: 'Show all cards' });
              onShowCards();
            }}
            className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
          >
            Show {filteredCards.length} cards
          </button>
        </div>
      </div>
    </div>
  );
}
