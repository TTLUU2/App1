import type { EligibilityStatus } from '@ph/shared';
import { Check, Clock, AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';
import { statusVisual } from '@/lib/theme';

const ICON_MAP = {
  check: Check,
  clock: Clock,
  alert: AlertTriangle,
  x: X,
} as const;

/**
 * Status chip. Pairs colour + icon + text so colour is never the only signal
 * (kickoff non-negotiable: accessibility).
 */
export function StatusChip({
  status,
  size = 'md',
}: {
  status: EligibilityStatus;
  size?: 'sm' | 'md';
}) {
  const visual = statusVisual(status);
  const Icon = ICON_MAP[visual.icon];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium',
        visual.chipClass,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
      {visual.label}
    </span>
  );
}
