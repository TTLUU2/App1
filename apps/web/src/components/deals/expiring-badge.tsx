import { cn } from './cn';
import { expiryStatus } from '@/lib/filter-deals';

interface ExpiringBadgeProps {
  endDate: string;
  now?: Date;
  className?: string;
}

export function ExpiringBadge({ endDate, now, className }: ExpiringBadgeProps) {
  const status = expiryStatus(endDate, now);

  if (status.kind === 'expired') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-mute',
          className,
        )}
      >
        Ended
      </span>
    );
  }

  if (status.kind === 'ending-soon') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full bg-rose/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-rose',
          className,
        )}
      >
        {status.daysLeft === 0
          ? 'Ends today'
          : status.daysLeft === 1
            ? 'Ends tomorrow'
            : `${status.daysLeft} days left`}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-mint/20 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-navy-deep',
        className,
      )}
    >
      {status.daysLeft} days left
    </span>
  );
}
