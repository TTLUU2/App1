'use client';

import type { Recommendation } from '@ph/shared';
import { Plane, CreditCard, Building2 } from 'lucide-react';
import clsx from 'clsx';
import { programGroup } from '@/lib/theme';
import { formatPoints } from '@/lib/format';
import type { FilterKey } from './sort-filter-bar';

/**
 * PRD §10.2.2: total eligible cards count + grouping by FF program target +
 * total points available across all eligible cards.
 *
 * Tiles are now interactive — tapping one applies the matching program
 * filter to the list below (shared via `activeFilter`/`onFilterChange`).
 * Tapping the already-active tile clears the filter back to 'all'.
 */
export function EligibleSummary({
  recommendations,
  activeFilter,
  onFilterChange,
}: {
  recommendations: Recommendation[];
  activeFilter: FilterKey;
  onFilterChange: (next: FilterKey) => void;
}) {
  const eligible = recommendations.filter((r) => r.eligibility.status === 'eligible');

  const groups: Record<'qantas' | 'velocity' | 'bank', { count: number; points: number }> = {
    qantas: { count: 0, points: 0 },
    velocity: { count: 0, points: 0 },
    bank: { count: 0, points: 0 },
  };

  for (const rec of eligible) {
    const g = programGroup(rec.card.rewardsProgram);
    groups[g.key].count += 1;
    groups[g.key].points += rec.card.bonusPoints ?? 0;
  }

  const totalPoints = eligible.reduce((sum, r) => sum + (r.card.bonusPoints ?? 0), 0);

  // 'Bank' tile maps to the 'flexible' filter key (sort-filter-bar uses
  // 'flexible' for bank/flexible points). Translate at the boundary so
  // tile-clicks and pill-clicks toggle the same underlying state.
  function tileToggle(key: FilterKey) {
    onFilterChange(activeFilter === key ? 'all' : key);
  }

  return (
    <section aria-labelledby="eligible-summary-heading">
      <h2
        id="eligible-summary-heading"
        className="px-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500"
      >
        Eligible cards
      </h2>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <GroupTile
          icon={<Plane className="h-4 w-4" aria-hidden />}
          label="Qantas"
          count={groups.qantas.count}
          className={programGroup('qantas').className}
          active={activeFilter === 'qantas'}
          onClick={() => tileToggle('qantas')}
        />
        <GroupTile
          icon={<Plane className="h-4 w-4 rotate-12" aria-hidden />}
          label="Velocity"
          count={groups.velocity.count}
          className={programGroup('velocity').className}
          active={activeFilter === 'velocity'}
          onClick={() => tileToggle('velocity')}
        />
        <GroupTile
          icon={<Building2 className="h-4 w-4" aria-hidden />}
          label="Bank"
          count={groups.bank.count}
          className={programGroup('bank').className}
          active={activeFilter === 'flexible'}
          onClick={() => tileToggle('flexible')}
        />
      </div>

      <div className="mt-2 flex items-center justify-between rounded-xl bg-zinc-100 px-3 py-2 text-xs dark:bg-zinc-900">
        <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          <CreditCard className="h-3.5 w-3.5" aria-hidden />
          {eligible.length} cards eligible right now
        </span>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {formatPoints(totalPoints)} pts total
        </span>
      </div>
    </section>
  );
}

function GroupTile({
  icon,
  label,
  count,
  className,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  className: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Filter eligible cards by ${label}`}
      className={clsx(
        'flex flex-col items-center justify-center gap-0.5 rounded-xl p-3 text-center transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)]',
        'hover:scale-[1.02] active:scale-95',
        className,
        active &&
          'ring-2 ring-[var(--color-ph-red)] ring-offset-2 ring-offset-white dark:ring-offset-zinc-950',
      )}
    >
      <div className="opacity-70">{icon}</div>
      <div className="text-xl font-semibold leading-none">{count}</div>
      <div className="text-[10px] font-medium opacity-80">{label}</div>
    </button>
  );
}
