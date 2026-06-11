import { cn } from './cn';
import type { LoyaltyProgram } from '@/data/deals-types';

/**
 * Logo marks for each loyalty program.
 *
 * Programs the user supplied a real logo file for (under public/program-
 * logos/) get rendered as <img>. Currently: Qantas, Velocity, Everyday
 * Rewards, Flybuys. The image is centred on a white tile with a light
 * border so the mark always reads cleanly regardless of the underlying
 * brand colour.
 *
 * The other programs (Marriott, Hilton, IHG, Accor, KrisFlyer, Asia
 * Miles) fall back to a brand-coloured monogram tile — same readability
 * approach we've used for them all along.
 *
 * To add a real logo for any of the fallback programs, drop a file at
 * public/program-logos/<program>.svg (or .png / .jpg) and add an entry
 * to LOGO_FILES below.
 */

interface MonogramStyle {
  bg: string;
  color: string;
  label: string;
  font?: 'serif';
}

const MONOGRAM: Record<LoyaltyProgram, MonogramStyle> = {
  // Fallback monogram tiles for programs without a supplied logo file.
  // Kept in this map even for the image-backed programs so a missing
  // file gracefully falls back to the monogram instead of broken img.
  qantas: { bg: '#E8002D', color: '#fff', label: 'Q', font: 'serif' },
  velocity: { bg: '#BF0000', color: '#fff', label: 'V' },
  'everyday-rewards': { bg: '#00843D', color: '#fff', label: 'E' },
  flybuys: { bg: '#0041AA', color: '#fff', label: 'fb' },
  'kris-flyer': { bg: '#003B6F', color: '#F0C040', label: 'SQ' },
  'asia-miles': { bg: '#006564', color: '#fff', label: 'CX' },
  'marriott-bonvoy': { bg: '#8B1538', color: '#fff', label: 'MR' },
  'hilton-honors': { bg: '#003580', color: '#fff', label: 'HH' },
  'ihg-one': { bg: '#C41E3A', color: '#fff', label: 'IHG' },
  'accor-all': { bg: '#001F5B', color: '#C9A84C', label: 'ALL' },
};

// Real logo files supplied by the user. The value is the public path
// next/Image-style under /program-logos/. Programs not in this map use
// the monogram tile.
const LOGO_FILES: Partial<Record<LoyaltyProgram, string>> = {
  qantas: '/program-logos/qantas.png',
  velocity: '/program-logos/velocity.svg',
  'everyday-rewards': '/program-logos/everyday-rewards.svg',
  flybuys: '/program-logos/flybuys.jpg',
};

const SIZE: Record<'sm' | 'md' | 'lg', { box: string; mono: string }> = {
  sm: { box: 'size-6 rounded-md', mono: 'text-[9px]' },
  md: { box: 'size-9 rounded-lg', mono: 'text-[10px]' },
  lg: { box: 'size-12 rounded-xl', mono: 'text-xs' },
};

interface ProgramLogoProps {
  program: LoyaltyProgram;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgramLogo({ program, size = 'md', className }: ProgramLogoProps) {
  const dims = SIZE[size];
  const logoFile = LOGO_FILES[program];

  // Real logo path — render as <img> centred on a white tile so the
  // brand mark reads cleanly. Object-contain so we don't crop or
  // distort the source artwork; padding lets the mark breathe.
  if (logoFile) {
    return (
      <span
        aria-label={program}
        title={program}
        className={cn(
          'inline-flex shrink-0 items-center justify-center bg-white p-0.5 ring-1 ring-zinc-200 shadow-sm dark:bg-zinc-100 dark:ring-zinc-300',
          dims.box,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoFile} alt={program} className="h-full w-full object-contain" loading="lazy" />
      </span>
    );
  }

  // Fallback monogram tile for programs without a supplied logo.
  const mono = MONOGRAM[program];
  return (
    <span
      aria-label={program}
      title={program}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-black leading-none tracking-tight select-none shadow-sm',
        dims.box,
        dims.mono,
        mono.font === 'serif' && 'font-serif',
        className,
      )}
      style={{ background: mono.bg, color: mono.color }}
    >
      {mono.label}
    </span>
  );
}
