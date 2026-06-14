import type { ProgramBranding } from '../types';

export function getOfferStatus(endDate: string): { text: string; classes: string } {
  if (!endDate) return { text: '', classes: '' };

  const today = new Date();
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 30 && diffDays > 0) {
    return { text: 'Ending Soon', classes: 'bg-red-100 text-red-700 border-red-200' };
  } else if (diffDays > 30) {
    return { text: 'Active Offer', classes: 'bg-green-100 text-green-700 border-green-200' };
  }
  return { text: '', classes: '' };
}

export function parseIncome(incomeStr: string | undefined): number {
  if (!incomeStr) return 0;
  const num = parseInt(incomeStr.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

export function getProgramBranding(programName: string): ProgramBranding {
  switch (programName) {
    case 'Velocity':
    case 'Velocity Frequent Flyer':
      return {
        logo: 'https://pointhacks-spa-tools.fly.dev/images/programs-small/velocity.png',
        color: '#512698',
      };
    case 'Qantas':
      return {
        logo: 'https://pointhacks-spa-tools.fly.dev/images/programs-small/qantas.png',
        color: '#DF0000',
      };
    case 'American Express Membership Rewards':
    case 'Membership Rewards Ascent Premium':
      return {
        logo: 'https://pointhacks-spa-tools.fly.dev/images/programs-small/amex-mr.png',
        color: '#016FD0',
      };
    case 'Westpac Altitude Rewards':
    case 'Altitude Rewards':
      return {
        logo: 'https://pointhacks-spa-tools.fly.dev/images/programs-small/altitude.png',
        color: '#DF0000',
      };
    case 'ANZ Rewards':
    case 'ANZ Business Rewards':
      return {
        logo: 'https://pointhacks-spa-tools.fly.dev/images/programs-small/anz-rewards.png',
        color: '#007DBA',
      };
    case 'Amplify Rewards':
      return {
        logo: 'https://pointhacks-spa-tools.fly.dev/images/programs-small/amplify.png',
        color: '#78BE20',
      };
    case 'NAB Rewards':
      return {
        logo: 'https://pointhacks-spa-tools.fly.dev/images/programs-small/nab-rewards.png',
        color: '#C20000',
      };
    case 'MyCard':
    case 'MyCard Rewards':
    case 'MyCard Rewards Premier':
    case 'MyCard Rewards Prestige':
      return {
        logo: 'https://pointhacks-spa-tools.fly.dev/images/programs-small/mycard.png',
        color: '#333333',
      };
    case 'Star Alliance':
      return {
        logo: 'https://pointhacks-spa-tools.fly.dev/images/programs-small/star-alliance.png',
        color: '#5B5C5E',
      };
    default:
      return { logo: '', color: '#333333' };
  }
}

/** Logo URL for a program name (for filter options). Tries "X Points" → "X" if no logo. */
export function getProgramLogo(programName: string): string {
  const b = getProgramBranding(programName);
  if (b.logo) return b.logo;
  if (programName.endsWith(' Points')) {
    return getProgramBranding(programName.replace(/ Points$/, '')).logo;
  }
  return '';
}

/**
 * Convert a PocketBase rate (multiplier, e.g. 0.33) to a clean divisor ratio.
 * Snaps to the nearest integer when within 0.05 so that e.g. 0.33 → 3 (not 3.0303).
 */
export function rateToRatio(rate: number): number {
  const ratio = 1 / rate;
  const rounded = Math.round(ratio);
  return Math.abs(ratio - rounded) < 0.05 ? rounded : ratio;
}

/** Map conversion destination name (from PocketBase) to a display color for tiles. */
export function getColorForDestinationName(destinationName: string): string {
  const n = (destinationName ?? '').trim();
  if (n.includes('Velocity')) return '#512698';
  if (n.includes('Qantas')) return '#DF0000';
  if (n.includes('KrisFlyer')) return '#FCB130';
  if (n.includes('Asia Miles') || n.includes('AsiaMiles') || n.includes('Cathay')) return '#00645A';
  if (n.includes('Qatar') || n.includes('Avios')) return '#662046';
  if (n.includes('Virgin') && n.includes('Atlantic')) return '#E4181E';
  if (n.includes('British Airways')) return '#01295C';
  return getProgramBranding(n).color || '#333333';
}
