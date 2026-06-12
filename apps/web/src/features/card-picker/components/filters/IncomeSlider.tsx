import { Info } from 'lucide-react';
import { INCOME_OPTIONS } from '../../data/filterOptions';

interface Props {
  userIncome: number;
  setUserIncome: (v: number) => void;
}

export function IncomeSlider({ userIncome, setUserIncome }: Props) {
  const selectedIndex = INCOME_OPTIONS.findIndex((opt) => opt.value === userIncome);

  return (
    <div className="mb-6 mt-4 pt-4 border-t border-slate-100">
      <h3 className="text-center text-sm font-extrabold text-black mb-4">Eligibility</h3>
      <div className="flex items-center justify-center mb-2">
        <span className="text-xs font-bold text-slate-700">Income requirements</span>
        <div className="group relative ml-1.5">
          <Info className="w-3 h-3 text-slate-400 cursor-pointer" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
            Some card providers require a minimum income to be eligible.
          </div>
        </div>
      </div>
      <div className="relative bg-slate-100 rounded-full p-1 border border-slate-200 flex">
        <div
          className="absolute top-1 bottom-1 bg-white rounded-full shadow-sm transition-all duration-300 ease-out z-0"
          style={{ width: `${(100 - 2) / 5}%`, left: `${selectedIndex * (100 / 5) + 0.5}%` }}
        />
        {INCOME_OPTIONS.map((option, index) => {
          let textColorClass = 'text-slate-500 hover:text-slate-700';
          if (selectedIndex === 0) {
            if (index === 0) textColorClass = 'text-red-600';
          } else {
            if (index > 0 && index <= selectedIndex) textColorClass = 'text-red-600';
          }
          return (
            <button
              key={option.label}
              onClick={() => setUserIncome(option.value)}
              className={`relative z-10 flex-1 text-[10px] font-bold py-2 rounded-full transition-colors duration-200 ${textColorClass}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
