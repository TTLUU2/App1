// Visual theming for issuer brand colour, status, and FF program.
// Status colours are always paired with an icon + text label per accessibility
// rule (kickoff non-negotiable: status colour is not the only signal).

import type { EligibilityStatus, RewardsProgram } from '@ph/shared';

export interface IssuerVisual {
  /** Tailwind classes for the card background (gradient). */
  gradient: string;
  /** Short tag overlaid on the card art. */
  tag: string;
}

export function issuerVisual(shortName: string): IssuerVisual {
  switch (shortName) {
    case 'Amex':
      return { gradient: 'from-blue-700 to-blue-900', tag: 'AMEX' };
    case 'ANZ':
      return { gradient: 'from-sky-600 to-sky-800', tag: 'ANZ' };
    case 'Westpac':
      return { gradient: 'from-rose-600 to-rose-800', tag: 'WBC' };
    case 'NAB':
      return { gradient: 'from-red-600 to-red-800', tag: 'NAB' };
    case 'Qantas':
      return { gradient: 'from-red-700 to-red-900', tag: 'QF' };
    case 'Citi':
      return { gradient: 'from-blue-600 to-indigo-700', tag: 'CITI' };
    case 'HSBC':
      return { gradient: 'from-red-700 to-rose-900', tag: 'HSBC' };
    case 'CBA':
      return { gradient: 'from-yellow-600 to-amber-800', tag: 'CBA' };
    case 'Virgin':
      return { gradient: 'from-red-500 to-red-700', tag: 'VM' };
    default:
      return { gradient: 'from-zinc-500 to-zinc-700', tag: shortName.slice(0, 4).toUpperCase() };
  }
}

export interface StatusVisual {
  /** "Eligible" / "Waiting" / etc — display label. */
  label: string;
  /** Tailwind classes for the chip. */
  chipClass: string;
  /** Lucide icon name to render alongside the label. */
  icon: 'check' | 'clock' | 'alert' | 'x';
}

export function statusVisual(status: EligibilityStatus): StatusVisual {
  switch (status) {
    case 'eligible':
      return {
        label: 'Eligible',
        chipClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
        icon: 'check',
      };
    case 'waiting':
      return {
        label: 'Waiting',
        chipClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
        icon: 'clock',
      };
    case 'grey_area':
      return {
        label: 'Grey area',
        chipClass: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
        icon: 'alert',
      };
    case 'not_eligible':
      return {
        label: 'Not eligible',
        chipClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
        icon: 'x',
      };
  }
}

export interface ProgramGroup {
  key: 'qantas' | 'velocity' | 'bank';
  label: string;
  className: string;
}

/** Group rewardsProgram values into the three FF buckets shown in Tab 4. */
export function programGroup(program: RewardsProgram): ProgramGroup {
  if (program === 'qantas') {
    return {
      key: 'qantas',
      label: 'Qantas',
      className: 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
    };
  }
  if (program === 'velocity') {
    return {
      key: 'velocity',
      label: 'Velocity',
      className: 'bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200',
    };
  }
  // 'flexible' and 'bank' both fall under "Bank / flexible" per PRD §10.2.2.
  return {
    key: 'bank',
    label: 'Bank',
    className: 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
  };
}
