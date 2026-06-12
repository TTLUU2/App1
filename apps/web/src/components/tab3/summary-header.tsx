import type { ComponentType, SVGProps } from 'react';
import { AlertTriangle, CreditCard, Sparkles, Target } from 'lucide-react';
import type { SummaryHeaderStats } from '@/lib/tab3-status';
import { formatCurrency, formatPoints } from '@/lib/format';

/** PRD §9.2.1 summary header. Four at-a-glance stats, each tagged
 * with a lucide icon so the metric reads visually at a glance:
 *   - CreditCard for active cards
 *   - Target     for the min-spend-to-go grind
 *   - Sparkles   for points pending
 *   - AlertTriangle for action needed
 */
export function SummaryHeader({ stats }: { stats: SummaryHeaderStats }) {
  return (
    <section aria-label="Card portfolio summary" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat icon={CreditCard} label="Active cards" value={String(stats.activeCount)} />
      <Stat
        icon={Target}
        label="Min-spend to go"
        value={formatCurrency(stats.totalMinSpendRemaining)}
        emphasis={stats.totalMinSpendRemaining > 0}
      />
      <Stat icon={Sparkles} label="Points pending" value={formatPoints(stats.totalPointsPending)} />
      <Stat
        icon={AlertTriangle}
        label="Action needed"
        value={String(stats.actionNeededCount)}
        emphasis={stats.actionNeededCount > 0}
        accent={stats.actionNeededCount > 0 ? 'red' : 'neutral'}
      />
    </section>
  );
}

type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>;

function Stat({
  icon: Icon,
  label,
  value,
  emphasis,
  accent = 'neutral',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  emphasis?: boolean;
  accent?: 'neutral' | 'red';
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        <Icon className="h-3 w-3 flex-none" aria-hidden />
        {label}
      </div>
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
