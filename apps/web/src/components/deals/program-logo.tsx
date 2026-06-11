import { cn } from './cn';
import type { LoyaltyProgram } from '@/data/deals-types';

/**
 * Brand-colour mark for each loyalty program. Uses each program's real
 * primary + text colour so it's instantly recognisable without needing
 * logo asset files.
 */

const BRAND: Record<LoyaltyProgram, { bg: string; color: string; label: string }> = {
  qantas: { bg: '#E8002D', color: '#fff', label: 'QF' },
  velocity: { bg: '#BF0000', color: '#fff', label: 'VA' },
  'kris-flyer': { bg: '#003B6F', color: '#F0C040', label: 'SQ' },
  'asia-miles': { bg: '#006564', color: '#fff', label: 'CX' },
  flybuys: { bg: '#0041AA', color: '#fff', label: 'fb' },
  'everyday-rewards': { bg: '#00843D', color: '#fff', label: 'ER' },
  'marriott-bonvoy': { bg: '#8B1538', color: '#fff', label: 'MR' },
  'hilton-honors': { bg: '#003580', color: '#fff', label: 'HH' },
  'ihg-one': { bg: '#C41E3A', color: '#fff', label: 'IHG' },
  'accor-all': { bg: '#001F5B', color: '#C9A84C', label: 'ALL' },
};

const SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'size-6 text-[8px] rounded-md',
  md: 'size-9 text-[10px] rounded-lg',
  lg: 'size-12 text-xs  rounded-xl',
};

interface ProgramLogoProps {
  program: LoyaltyProgram;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgramLogo({ program, size = 'md', className }: ProgramLogoProps) {
  const brand = BRAND[program];
  return (
    <span
      aria-label={program}
      title={program}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-bold tracking-tight select-none',
        SIZE[size],
        className,
      )}
      style={{ background: brand.bg, color: brand.color }}
    >
      {brand.label}
    </span>
  );
}
