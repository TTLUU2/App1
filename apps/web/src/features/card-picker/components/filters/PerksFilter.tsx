import { PERK_OPTIONS } from '../../data/filterOptions';

interface Props {
  selectedPerks: Set<string>;
  togglePerk: (id: string) => void;
}

export function PerksFilter({ selectedPerks, togglePerk }: Props) {
  return (
    <div className="w-full bg-white pt-2 pb-2">
      <div className="grid grid-cols-2 gap-2">
        {PERK_OPTIONS.map((perk) => (
          <button
            key={perk.id}
            onClick={() => togglePerk(perk.id)}
            className={`flex flex-col items-center justify-center p-1 h-14 border rounded-md transition-all duration-200 ${
              selectedPerks.has(perk.id)
                ? 'bg-red-50 border-red-600 shadow-[inset_0_0_0_1px_#DC2626]'
                : 'bg-white border-slate-300 hover:border-slate-400'
            }`}
          >
            <img
              src={perk.icon}
              alt={perk.name}
              className={`w-4 h-4 mb-1 object-contain transition-all ${
                selectedPerks.has(perk.id) ? 'opacity-100 filter-none' : 'opacity-70 grayscale'
              }`}
            />
            <span
              className={`text-[10px] font-semibold text-center leading-tight px-1 ${
                selectedPerks.has(perk.id) ? 'text-red-600' : 'text-slate-600'
              }`}
            >
              {perk.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
