'use client';

/**
 * CityIllustration — small stylised landmark silhouettes per
 * destination. Used as a banner across the top of destination tiles
 * and tracked-journey cards in the Journeys view, where the space
 * would otherwise be empty.
 *
 * Style:
 *   - Uniform viewBox 120×50 so every illustration tiles consistently
 *   - Line + fill in currentColor → caller drives the colour (red ink
 *     on a cream background reads as a passport stamp)
 *   - Intentionally simple — 2-4 landmarks per city, no realism
 *
 * Add new cities by adding a case to `CityIllustration` and writing
 * the silhouette. Unknown ids fall back to `GenericSkyline`.
 */

import type { SVGProps } from 'react';

const VIEWBOX = '0 0 120 50';

interface Props extends SVGProps<SVGSVGElement> {
  destinationId: string;
}

export function CityIllustration({ destinationId, className, ...rest }: Props) {
  const Component = ILLUSTRATIONS[destinationId] ?? GenericSkyline;
  return <Component className={className} {...rest} />;
}

const ILLUSTRATIONS: Record<string, (p: SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  nrt: TokyoArt,
  kix: OsakaArt,
  icn: SeoulArt,
  lhr: LondonArt,
  cdg: ParisArt,
  lax: LosAngelesArt,
  sin: SingaporeArt,
  hkg: HongKongArt,
};

function TokyoArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      {...props}
    >
      {/* Ground baseline */}
      <line x1="2" y1="46" x2="118" y2="46" />
      {/* Mt Fuji */}
      <path d="M 6 46 L 32 16 L 58 46 Z" />
      {/* Snowcap */}
      <path
        d="M 24 24 L 32 16 L 40 24 L 36 26 L 32 22 L 28 26 Z"
        fill="currentColor"
        stroke="none"
        opacity="0.85"
      />
      {/* Distant clouds */}
      <path d="M 12 20 q 4 -3 8 0 q 4 -3 8 0" opacity="0.4" />
      {/* Tokyo Tower */}
      <path d="M 78 6 L 84 6 M 76 46 L 86 46" />
      <path d="M 78 6 L 76 46 M 84 6 L 86 46" />
      <path d="M 76.6 14 L 85.4 14 M 77 22 L 85 22 M 77.6 30 L 84.4 30 M 78 38 L 84 38" />
      <path d="M 81 3 L 81 6" />
      {/* Skyscrapers in the background */}
      <path
        d="M 92 46 L 92 30 L 96 30 L 96 26 L 100 26 L 100 46 Z"
        fill="currentColor"
        opacity="0.18"
        stroke="none"
      />
      <path
        d="M 102 46 L 102 22 L 106 22 L 106 18 L 110 18 L 110 46 Z"
        fill="currentColor"
        opacity="0.28"
        stroke="none"
      />
      <path
        d="M 112 46 L 112 28 L 116 28 L 116 46 Z"
        fill="currentColor"
        opacity="0.18"
        stroke="none"
      />
    </svg>
  );
}

function OsakaArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      {...props}
    >
      {/* Ground baseline */}
      <line x1="2" y1="46" x2="118" y2="46" />
      {/* Tsutenkaku Tower — flatter, wider lattice tower than Tokyo Tower */}
      <g>
        {/* Antenna */}
        <line x1="40" y1="10" x2="40" y2="6" />
        {/* Top observation deck */}
        <path d="M 36 10 L 44 10 L 44 12 L 36 12 Z" fill="currentColor" stroke="none" />
        {/* Tapering lattice */}
        <path d="M 36 12 L 33 24 L 47 24 L 44 12" />
        <path d="M 33 24 L 28 46 M 47 24 L 52 46" />
        {/* Cross beams */}
        <path d="M 35 18 L 45 18 M 31 32 L 49 32 M 30 40 L 50 40" opacity="0.65" />
        {/* Diagonals */}
        <path d="M 35 12 L 45 24 M 45 12 L 35 24" opacity="0.45" />
        <path d="M 33 24 L 49 32 M 47 24 L 31 32" opacity="0.4" />
      </g>
      {/* Osaka Castle — pagoda-tiered keep with curved eaves, just behind */}
      <g>
        {/* Base */}
        <path
          d="M 64 46 L 64 38 L 86 38 L 86 46 Z"
          fill="currentColor"
          opacity="0.18"
          stroke="none"
        />
        <path d="M 64 38 L 86 38" />
        {/* Tier 2 roof */}
        <path d="M 62 38 Q 75 32 88 38" />
        <path d="M 67 38 L 67 32 L 83 32 L 83 38" />
        {/* Tier 3 roof */}
        <path d="M 65 32 Q 75 27 85 32" />
        <path d="M 70 32 L 70 26 L 80 26 L 80 32" />
        {/* Top tier + finial */}
        <path d="M 68 26 Q 75 22 82 26" />
        <path d="M 73 26 L 73 22 L 77 22 L 77 26" />
        <line x1="75" y1="22" x2="75" y2="18" />
        <circle cx="75" cy="17" r="0.9" fill="currentColor" stroke="none" />
      </g>
      {/* Distant skyscraper cluster */}
      <g fill="currentColor" stroke="none">
        <rect x="6" y="36" width="6" height="10" opacity="0.18" />
        <rect x="14" y="30" width="6" height="16" opacity="0.22" />
        <rect x="92" y="32" width="6" height="14" opacity="0.2" />
        <rect x="100" y="26" width="6" height="20" opacity="0.28" />
        <rect x="108" y="34" width="6" height="12" opacity="0.18" />
      </g>
      {/* Castle moat ripples */}
      <path d="M 60 44 q 4 -2 8 0 q 4 -2 8 0 q 4 -2 8 0" opacity="0.35" />
    </svg>
  );
}

function SeoulArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="2" y1="46" x2="118" y2="46" />
      {/* Lotte World Tower — very tall, tapered, pointed skyscraper centre */}
      <g>
        {/* Spire */}
        <line x1="60" y1="8" x2="60" y2="4" />
        {/* Tapered body — narrows toward top */}
        <path d="M 56 8 L 64 8 L 67 46 L 53 46 Z" fill="currentColor" opacity="0.3" stroke="none" />
        <path d="M 56 8 L 64 8 L 67 46 L 53 46 Z" />
        {/* Floor banding hint */}
        <path
          d="M 55 16 L 65 16 M 54.5 24 L 65.5 24 M 54 32 L 66 32 M 53.5 40 L 66.5 40"
          opacity="0.45"
        />
      </g>
      {/* Skyline left + right of the tower */}
      <g fill="currentColor" stroke="none">
        <rect x="14" y="32" width="6" height="14" opacity="0.5" />
        <rect x="22" y="22" width="6" height="24" opacity="0.65" />
        <rect x="30" y="28" width="6" height="18" opacity="0.55" />
        <rect x="38" y="20" width="7" height="26" opacity="0.7" />
        <rect x="46" y="26" width="5" height="20" opacity="0.5" />
        {/* Right */}
        <rect x="74" y="24" width="6" height="22" opacity="0.65" />
        <rect x="82" y="30" width="6" height="16" opacity="0.5" />
        <rect x="90" y="20" width="7" height="26" opacity="0.7" />
        <rect x="99" y="26" width="6" height="20" opacity="0.55" />
        <rect x="107" y="32" width="6" height="14" opacity="0.5" />
      </g>
      {/* Antennae */}
      <line x1="41" y1="20" x2="41" y2="14" />
      <line x1="93" y1="20" x2="93" y2="14" />
      {/* Hanok roof row — traditional curved rooflines in the foreground */}
      <g opacity="0.8">
        {/* Three small hanok houses side-by-side */}
        <path d="M 8 46 L 8 42 Q 14 38 20 42 L 20 46" />
        <path d="M 6 42 Q 14 36 22 42" />
        <path d="M 24 46 L 24 42 Q 30 38 36 42 L 36 46" />
        <path d="M 22 42 Q 30 36 38 42" />
        <path d="M 82 46 L 82 42 Q 88 38 94 42 L 94 46" />
        <path d="M 80 42 Q 88 36 96 42" />
        <path d="M 98 46 L 98 42 Q 104 38 110 42 L 110 46" />
        <path d="M 96 42 Q 104 36 112 42" />
      </g>
    </svg>
  );
}

function LondonArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="2" y1="46" x2="118" y2="46" />
      {/* Big Ben tower */}
      <path d="M 12 46 L 12 16 L 20 16 L 20 46 Z" />
      {/* Clock face */}
      <circle cx="16" cy="22" r="3" />
      <line x1="16" y1="22" x2="16" y2="20" />
      <line x1="16" y1="22" x2="18" y2="22" />
      {/* Spire */}
      <path d="M 12 16 L 16 8 L 20 16 Z" />
      <line x1="16" y1="8" x2="16" y2="5" />
      {/* Tower Bridge — two towers + walkway */}
      <path d="M 42 46 L 42 24 L 50 24 L 50 46" />
      <path d="M 58 46 L 58 24 L 66 24 L 66 46" />
      <path d="M 50 30 L 58 30 M 50 24 L 58 24" />
      <path d="M 42 24 L 46 18 L 50 24 M 58 24 L 62 18 L 66 24" />
      {/* Suspension cables */}
      <path d="M 38 46 Q 54 32 70 46" opacity="0.5" />
      {/* London Eye */}
      <circle cx="92" cy="26" r="14" />
      <circle cx="92" cy="26" r="2" fill="currentColor" stroke="none" />
      <line x1="92" y1="12" x2="92" y2="40" opacity="0.5" />
      <line x1="78" y1="26" x2="106" y2="26" opacity="0.5" />
      <line x1="82" y1="16" x2="102" y2="36" opacity="0.5" />
      <line x1="82" y1="36" x2="102" y2="16" opacity="0.5" />
      {/* Cabins */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const r = 14;
        const rad = (deg * Math.PI) / 180;
        const cx = 92 + r * Math.cos(rad);
        const cy = 26 + r * Math.sin(rad);
        return <circle key={deg} cx={cx} cy={cy} r="1.4" fill="currentColor" stroke="none" />;
      })}
    </svg>
  );
}

function ParisArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="2" y1="46" x2="118" y2="46" />
      {/* Eiffel Tower */}
      <path d="M 36 6 L 42 6 M 39 3 L 39 6" />
      {/* Top spire */}
      <path d="M 36 6 L 35 14 L 43 14 L 42 6" />
      {/* Mid tier */}
      <path d="M 33 14 Q 39 22 45 14 M 33 28 L 45 28" />
      {/* Legs curving outward */}
      <path d="M 35 14 Q 30 30 26 46" />
      <path d="M 43 14 Q 48 30 52 46" />
      {/* Cross beams */}
      <path d="M 30 24 L 48 24 M 30 24 L 32 30 M 48 24 L 46 30" opacity="0.7" />
      <path d="M 28 36 L 50 36" opacity="0.6" />
      {/* Arc de Triomphe */}
      <path d="M 70 46 L 70 22 L 96 22 L 96 46 Z" />
      <path d="M 78 46 L 78 32 Q 83 26 88 32 L 88 46" />
      <path d="M 70 22 L 70 18 L 96 18 L 96 22" />
      {/* Tiny carvings */}
      <line x1="74" y1="28" x2="74" y2="32" opacity="0.5" />
      <line x1="92" y1="28" x2="92" y2="32" opacity="0.5" />
      {/* Champ-de-Mars hedges */}
      <path d="M 102 46 q 3 -4 6 0 q 3 -4 6 0" opacity="0.5" />
    </svg>
  );
}

function LosAngelesArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="2" y1="46" x2="118" y2="46" />
      {/* Hollywood hills */}
      <path
        d="M 2 46 Q 30 22 60 32 Q 90 22 118 46 Z"
        fill="currentColor"
        opacity="0.16"
        stroke="none"
      />
      <path d="M 2 46 Q 30 22 60 32 Q 90 22 118 46" />
      {/* Hollywood sign — block letters on a hill */}
      <g opacity="0.85">
        <rect x="50" y="14" width="2.5" height="6" fill="currentColor" stroke="none" />
        <rect x="54" y="14" width="2.5" height="6" fill="currentColor" stroke="none" />
        <rect x="58" y="14" width="2.5" height="6" fill="currentColor" stroke="none" />
        <rect x="62" y="14" width="2.5" height="6" fill="currentColor" stroke="none" />
        <rect x="66" y="14" width="2.5" height="6" fill="currentColor" stroke="none" />
        <rect x="70" y="14" width="2.5" height="6" fill="currentColor" stroke="none" />
        <rect x="74" y="14" width="2.5" height="6" fill="currentColor" stroke="none" />
        <rect x="78" y="14" width="2.5" height="6" fill="currentColor" stroke="none" />
        <rect x="82" y="14" width="2.5" height="6" fill="currentColor" stroke="none" />
      </g>
      {/* Palm tree left */}
      <path d="M 12 46 L 14 24" />
      <path
        d="M 14 24 q 6 -4 12 -2 M 14 24 q -6 -4 -12 -2 M 14 24 q 4 -8 8 -10 M 14 24 q -4 -8 -8 -10 M 14 24 q 0 -6 0 -12"
        strokeLinecap="round"
      />
      {/* Palm tree right */}
      <path d="M 106 46 L 108 26" />
      <path
        d="M 108 26 q 6 -4 10 -2 M 108 26 q -6 -4 -10 -2 M 108 26 q 4 -7 7 -9 M 108 26 q -4 -7 -7 -9 M 108 26 q 0 -6 0 -10"
        strokeLinecap="round"
      />
      {/* Sun */}
      <circle cx="100" cy="14" r="3" fill="currentColor" stroke="none" opacity="0.7" />
    </svg>
  );
}

function SingaporeArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="2" y1="46" x2="118" y2="46" />
      {/* Marina Bay Sands — three towers + boat platform */}
      <path d="M 32 46 L 32 16 L 38 16 L 38 46 Z" />
      <path d="M 54 46 L 54 16 L 60 16 L 60 46 Z" />
      <path d="M 76 46 L 76 16 L 82 16 L 82 46 Z" />
      {/* The boat */}
      <path
        d="M 26 16 Q 57 6 88 16 L 84 18 Q 57 10 30 18 Z"
        fill="currentColor"
        stroke="none"
        opacity="0.7"
      />
      <path d="M 26 16 Q 57 6 88 16" />
      {/* Palm */}
      <path d="M 12 46 L 13 30" />
      <path
        d="M 13 30 q 5 -3 9 -1 M 13 30 q -5 -3 -9 -1 M 13 30 q 3 -6 6 -8 M 13 30 q -3 -6 -6 -8"
        strokeLinecap="round"
      />
      {/* Merlion silhouette (very abstracted) */}
      <path
        d="M 100 46 L 100 32 Q 104 30 106 34 Q 108 30 112 32 L 112 46 Z"
        fill="currentColor"
        opacity="0.4"
        stroke="none"
      />
      {/* Water lines */}
      <path d="M 92 42 q 4 -2 8 0 q 4 -2 8 0 q 4 -2 8 0" opacity="0.4" />
    </svg>
  );
}

function HongKongArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="2" y1="46" x2="118" y2="46" />
      {/* Victoria Peak backdrop */}
      <path
        d="M 2 46 Q 40 22 60 30 Q 80 22 118 46 Z"
        fill="currentColor"
        opacity="0.15"
        stroke="none"
      />
      <path d="M 2 46 Q 40 22 60 30 Q 80 22 118 46" />
      {/* Skyscraper cluster, ascending */}
      <g fill="currentColor" stroke="none">
        <rect x="22" y="32" width="6" height="14" opacity="0.55" />
        <rect x="30" y="26" width="6" height="20" opacity="0.7" />
        <rect x="38" y="22" width="6" height="24" opacity="0.85" />
        <rect x="46" y="16" width="6" height="30" />
        {/* Bank of China-ish triangle top */}
        <path d="M 56 46 L 56 12 L 62 8 L 62 46 Z" />
        <rect x="66" y="14" width="6" height="32" opacity="0.85" />
        <rect x="74" y="20" width="6" height="26" opacity="0.7" />
        <rect x="82" y="26" width="6" height="20" opacity="0.7" />
        <rect x="90" y="30" width="6" height="16" opacity="0.55" />
      </g>
      {/* Antenna spikes */}
      <line x1="49" y1="16" x2="49" y2="10" stroke="currentColor" strokeWidth="1.2" />
      <line x1="69" y1="14" x2="69" y2="6" stroke="currentColor" strokeWidth="1.2" />
      {/* Harbour ripples */}
      <path d="M 100 42 q 3 -2 6 0 q 3 -2 6 0" opacity="0.4" />
    </svg>
  );
}

function GenericSkyline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="2" y1="46" x2="118" y2="46" />
      <g fill="currentColor" stroke="none" opacity="0.6">
        <rect x="14" y="32" width="6" height="14" />
        <rect x="22" y="22" width="8" height="24" />
        <rect x="32" y="28" width="6" height="18" />
        <rect x="40" y="16" width="9" height="30" />
        <rect x="51" y="24" width="6" height="22" />
        <rect x="59" y="20" width="7" height="26" />
        <rect x="68" y="14" width="8" height="32" />
        <rect x="78" y="22" width="6" height="24" />
        <rect x="86" y="28" width="6" height="18" />
        <rect x="94" y="20" width="7" height="26" />
        <rect x="103" y="30" width="6" height="16" />
      </g>
      <line x1="44" y1="16" x2="44" y2="10" />
      <line x1="72" y1="14" x2="72" y2="6" />
    </svg>
  );
}
