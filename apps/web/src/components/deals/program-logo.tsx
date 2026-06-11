import { cn } from './cn';
import type { LoyaltyProgram } from '@/data/deals-types';

/**
 * Brand-aware logo marks for each loyalty program. The big three (Qantas,
 * Velocity, Everyday Rewards) get distinctive single-letter monogram marks
 * with the brand's real primary colour, sized to fill the tile so they read
 * as proper logos at a glance. The smaller / less common programs fall
 * back to a brand-coloured tile with a 2-3 char abbreviation — same
 * readability approach, just less screen-share.
 *
 * Real vector logo files (.svg / image refs) deliberately avoided for
 * trademark hygiene; the stylised letterforms here approximate the brand
 * without copying upstream artwork.
 */

interface BrandStyle {
  bg: string;
  color: string;
  label: string;
  // 'mark' = a single big letterform like a logo monogram; 'tile' = the
  // smaller 2-3 char abbreviation chip for less-prominent programs.
  variant: 'mark' | 'tile';
  // Tighter custom font per program — nudges it closer to the recognisable
  // brand letterform (Qantas uses a serif-like roundel, etc.).
  font?: 'serif';
}

const BRAND: Record<LoyaltyProgram, BrandStyle> = {
  qantas: { bg: '#E8002D', color: '#fff', label: 'Q', variant: 'mark', font: 'serif' },
  velocity: { bg: '#BF0000', color: '#fff', label: 'V', variant: 'mark' },
  'everyday-rewards': { bg: '#00843D', color: '#fff', label: 'E', variant: 'mark' },
  // Tile variant — branded abbreviations for the less-prominent programs.
  'kris-flyer': { bg: '#003B6F', color: '#F0C040', label: 'SQ', variant: 'tile' },
  'asia-miles': { bg: '#006564', color: '#fff', label: 'CX', variant: 'tile' },
  flybuys: { bg: '#0041AA', color: '#fff', label: 'fb', variant: 'tile' },
  'marriott-bonvoy': { bg: '#8B1538', color: '#fff', label: 'MR', variant: 'tile' },
  'hilton-honors': { bg: '#003580', color: '#fff', label: 'HH', variant: 'tile' },
  'ihg-one': { bg: '#C41E3A', color: '#fff', label: 'IHG', variant: 'tile' },
  'accor-all': { bg: '#001F5B', color: '#C9A84C', label: 'ALL', variant: 'tile' },
};

const SIZE: Record<'sm' | 'md' | 'lg', { box: string; mark: string; tile: string }> = {
  sm: { box: 'size-6 rounded-md', mark: 'text-[15px]', tile: 'text-[9px]' },
  md: { box: 'size-9 rounded-lg', mark: 'text-[22px]', tile: 'text-[10px]' },
  lg: { box: 'size-12 rounded-xl', mark: 'text-[30px]', tile: 'text-xs' },
};

interface ProgramLogoProps {
  program: LoyaltyProgram;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgramLogo({ program, size = 'md', className }: ProgramLogoProps) {
  const brand = BRAND[program];
  const dims = SIZE[size];
  return (
    <span
      aria-label={program}
      title={program}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-black leading-none tracking-tight select-none shadow-sm',
        dims.box,
        brand.variant === 'mark' ? dims.mark : dims.tile,
        brand.font === 'serif' && 'font-serif',
        className,
      )}
      style={{ background: brand.bg, color: brand.color }}
    >
      {brand.label}
    </span>
  );
}
