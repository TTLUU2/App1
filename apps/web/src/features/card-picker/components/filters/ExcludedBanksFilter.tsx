import type { Card } from '../../types';
import { BANK_OPTIONS } from '../../data/filterOptions';

interface Props {
  cards: Card[];
  heldBanks: Set<string>;
  toggleHeldBank: (name: string) => void;
}

export function ExcludedBanksFilter({ cards, heldBanks, toggleHeldBank }: Props) {
  const activeProviders = new Set(cards.map((c) => c.provider));
  const visibleBanks = BANK_OPTIONS.filter((bank) => {
    if (bank.provider && activeProviders.has(bank.provider)) return true;
    if (bank.excludeProviders?.some((p) => activeProviders.has(p))) return true;
    return activeProviders.has(bank.name);
  });

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <div className="mb-4 text-center">
        <label className="block text-xs font-bold text-slate-800 mb-1">Excluded Banks</label>
        <p className="text-[10px] text-slate-400">
          Select all banks you currently hold, or have previously held a{' '}
          <span className="font-bold">rewards earning</span> credit card with, within the specified
          time frame (from the cancellation date).
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 justify-items-center items-start">
        {visibleBanks.map((bank) => {
          const isSelected = heldBanks.has(bank.name);
          return (
            <button
              key={bank.name}
              onClick={() => toggleHeldBank(bank.name)}
              className={`relative flex flex-col items-center justify-between p-2 border rounded-lg h-[72px] w-full transition-all duration-200 ${
                isSelected
                  ? 'bg-red-50 border-red-600 shadow-[inset_0_0_0_1px_#DC2626]'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span
                className={`text-[10px] font-bold text-center line-clamp-1 w-full ${isSelected ? 'text-red-600' : 'text-slate-700'}`}
              >
                {bank.name}
              </span>
              <div className="h-[17px] flex items-center justify-center w-full">
                <img src={bank.logo} alt={bank.name} className="h-full object-contain max-w-full" />
              </div>
              {bank.exclusion ? (
                isSelected ? (
                  <span className="text-[8px] font-bold text-red-600 border border-red-600 px-1 rounded bg-white mt-0.5 inline-block">
                    Ineligible
                  </span>
                ) : (
                  <span className="text-[8px] text-slate-400 text-center leading-tight mt-0.5 w-full">
                    {bank.exclusion}
                  </span>
                )
              ) : (
                <span className="text-[8px] mt-0.5 invisible">&#8203;</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
