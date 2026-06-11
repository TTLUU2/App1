'use client';

import { cn } from './cn';
import {
  DEAL_TYPE_LABELS,
  FLYER_SUBTYPE_LABELS,
  PROGRAM_SHORT,
  type DealType,
  type ExpiringWindow,
  type FilterState,
  type FlyerSubtype,
  type LoyaltyProgram,
  type ProgramCategory,
} from '@/data/deals-types';

const DEAL_TYPES: DealType[] = ['gift-card', 'flyer', 'hotel'];
const FLYER_SUBTYPES: FlyerSubtype[] = ['earn', 'burn', 'buy', 'status'];

const PROGRAM_GROUPS: { category: ProgramCategory; label: string; programs: LoyaltyProgram[] }[] = [
  {
    category: 'airline',
    label: 'Airlines',
    programs: ['qantas', 'velocity', 'kris-flyer', 'asia-miles'],
  },
  {
    category: 'hotel',
    label: 'Hotels',
    programs: ['marriott-bonvoy', 'hilton-honors', 'ihg-one', 'accor-all'],
  },
  {
    category: 'retail',
    label: 'Retail / Supermarket',
    programs: ['flybuys', 'everyday-rewards'],
  },
];

const EXPIRING_OPTIONS: { value: ExpiringWindow; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '30d', label: '30 days' },
  { value: '7d', label: '7 days' },
];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

interface FilterControlsProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
}

export function FilterControls({ filters, onChange }: FilterControlsProps) {
  const flyerSelected = filters.dealTypes.includes('flyer');

  const update = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="space-y-7">
      {/* Deal type */}
      <Section title="Deal type">
        <div className="space-y-1.5">
          {DEAL_TYPES.map((t) => (
            <CheckRow
              key={t}
              checked={filters.dealTypes.includes(t)}
              onChange={() => {
                const nextTypes = toggle(filters.dealTypes, t);
                const stillHasFlyer = nextTypes.includes('flyer');
                update({
                  dealTypes: nextTypes,
                  flyerSubtypes: stillHasFlyer ? filters.flyerSubtypes : [],
                });
              }}
              label={DEAL_TYPE_LABELS[t]}
            />
          ))}
        </div>
      </Section>

      {/* Flyer subtype (conditional) */}
      {flyerSelected && (
        <Section title="Frequent flyer">
          <div className="flex flex-wrap gap-1.5">
            {FLYER_SUBTYPES.map((s) => {
              const active = filters.flyerSubtypes.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ flyerSubtypes: toggle(filters.flyerSubtypes, s) })}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition',
                    active
                      ? 'border-navy bg-navy text-paper'
                      : 'border-line bg-paper text-ink-soft hover:border-navy/40 hover:text-ink',
                  )}
                >
                  {FLYER_SUBTYPE_LABELS[s]}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* Programs */}
      <Section title="Loyalty program">
        <div className="space-y-4">
          {PROGRAM_GROUPS.map((group) => (
            <div key={group.category}>
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-mute">
                {group.label}
              </div>
              <div className="space-y-1.5">
                {group.programs.map((p) => (
                  <CheckRow
                    key={p}
                    checked={filters.programs.includes(p)}
                    onChange={() => update({ programs: toggle(filters.programs, p) })}
                    label={PROGRAM_SHORT[p]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Expiring */}
      <Section title="Expiring within">
        <div className="inline-flex rounded-full border border-line bg-paper p-1">
          {EXPIRING_OPTIONS.map((o) => {
            const active = filters.expiringWindow === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => update({ expiringWindow: o.value })}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition',
                  active ? 'bg-navy text-paper' : 'text-ink-soft hover:text-ink',
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 font-serif text-sm font-medium text-ink">{title}</h3>
      {children}
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-ink-soft hover:text-ink">
      <span
        className={cn(
          'grid size-4 place-items-center rounded border transition',
          checked ? 'border-navy bg-navy' : 'border-line bg-paper',
        )}
      >
        {checked && (
          <svg viewBox="0 0 10 10" aria-hidden className="size-2.5 text-paper">
            <path
              d="M1.5 5l2.2 2.2L8.5 2.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
