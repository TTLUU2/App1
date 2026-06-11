import { cn } from './cn';
import { PROGRAM_SHORT, type LoyaltyProgram } from '@/data/deals-types';

interface ProgramBadgeProps {
  program: LoyaltyProgram;
  className?: string;
}

export function ProgramBadge({ program, className }: ProgramBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-line bg-paper px-2 py-0.5 text-[11px] font-medium text-ink-soft',
        className,
      )}
    >
      {PROGRAM_SHORT[program]}
    </span>
  );
}
