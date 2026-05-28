'use client';

import type { Recommendation } from '@ph/shared';
import { Plane, CreditCard, Building2 } from 'lucide-react';
import clsx from 'clsx';
import { programGroup } from '@/lib/theme';
import { formatPoints } from '@/lib/format';

/**
 * PRD §10.2.2: total eligible cards count + grouping by FF program target +
 * total points available across all eligible cards.
 */
export function EligibleSummary({ recommendations }: { recommendations: Recommendation[] }) {
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
        />
        <GroupTile
          icon={<Plane className="h-4 w-4 rotate-12" aria-hidden />}
          label="Velocity"
          count={groups.velocity.count}
          className={programGroup('velocity').className}
        />
        <GroupTile
          icon={<Building2 className="h-4 w-4" aria-hidden />}
          label="Bank"
          count={groups.bank.count}
          className={programGroup('bank').className}
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
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  className: string;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-0.5 rounded-xl p-3 text-center',
        className,
      )}
    >
      <div className="opacity-70">{icon}</div>
      <div className="text-xl font-semibold leading-none">{count}</div>
      <div className="text-[10px] font-medium opacity-80">{label}</div>
    </div>
  );
}
