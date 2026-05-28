import type { SummaryHeaderStats } from '@/lib/tab3-status';
import { formatCurrency, formatPoints } from '@/lib/format';

/** PRD §9.2.1 summary header. Four at-a-glance stats. */
export function SummaryHeader({ stats }: { stats: SummaryHeaderStats }) {
  return (
    <section aria-label="Card portfolio summary" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Active cards" value={String(stats.activeCount)} />
      <Stat
        label="Min-spend to go"
        value={formatCurrency(stats.totalMinSpendRemaining)}
        emphasis={stats.totalMinSpendRemaining > 0}
      />
      <Stat label="Points pending" value={formatPoints(stats.totalPointsPending)} />
      <Stat
        label="Action needed"
        value={String(stats.actionNeededCount)}
        emphasis={stats.actionNeededCount > 0}
        accent={stats.actionNeededCount > 0 ? 'red' : 'neutral'}
      />
    </section>
  );
}

function Stat({
  label,
  value,
  emphasis,
  accent = 'neutral',
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  accent?: 'neutral' | 'red';
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div
        className={
          accent === 'red' && emphasis
            ? 'mt-0.5 text-lg font-semibold text-[var(--color-ph-red)] tabular-nums'
            : emphasis
              ? 'mt-0.5 text-lg font-semibold tabular-nums'
              : 'mt-0.5 text-lg font-semibold tabular-nums text-zinc-700 dark:text-zinc-300'
        }
      >
        {value}
      </div>
    </div>
  );
}
