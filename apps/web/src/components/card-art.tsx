import type { CardWithIssuer } from '@ph/shared';
import clsx from 'clsx';
import { issuerVisual } from '@/lib/theme';
import { formatPoints } from '@/lib/format';

/**
 * Procedurally-rendered "card art" tinted by issuer brand colour.
 * Mirrors the prototype's visual (no real card images shipped in M1).
 */
export function CardArt({
  card,
  size = 'md',
  greyed = false,
}: {
  card: CardWithIssuer;
  size?: 'sm' | 'md' | 'lg';
  greyed?: boolean;
}) {
  const visual = issuerVisual(card.issuer.shortName);
  const sizeClass = size === 'lg' ? 'h-32 w-52' : size === 'sm' ? 'h-14 w-24' : 'h-20 w-32';

  return (
    <div
      role="img"
      aria-label={`${card.issuer.name} ${card.name} card`}
      className={clsx(
        'relative overflow-hidden rounded-xl bg-gradient-to-br shadow-md ring-1 ring-black/5',
        sizeClass,
        greyed ? 'from-zinc-300 to-zinc-500 grayscale' : visual.gradient,
      )}
    >
      {/* magstripe / chip glints */}
      <span aria-hidden className="absolute left-2 top-2 h-3 w-4 rounded-sm bg-yellow-300/80" />
      <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-white/40" />
      <div className="absolute inset-x-0 bottom-1 flex items-end justify-between px-2 text-white">
        <span className="text-[10px] font-semibold tracking-wider opacity-90">{visual.tag}</span>
        {card.bonusPoints != null && (
          <span className="text-[10px] font-medium opacity-80">
            {formatPoints(card.bonusPoints)} pts
          </span>
        )}
      </div>
    </div>
  );
}
