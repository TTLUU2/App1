'use client';

/**
 * WorldMap — stylised destination picker for the Track-a-journey
 * wizard. Continents come from world-atlas's 50m TopoJSON land
 * silhouette (~533KB raw / ~80KB gzip — chunky but the wizard route
 * is split-loaded, and 50m gives recognisable continent shapes when
 * the map is zoomed into a single region; the 110m fallback looks
 * pixellated under zoom).
 *
 * Projection: equirectangular over a 360×180 viewBox (x = lng+180,
 * y = 90−lat). The whole inner content lives inside a `<g>` whose
 * transform we animate to "fly" the camera from the world view into
 * a region bbox. Pins (and their pulse rings + labels) counter-scale
 * via the `counterScale` prop so they stay the same physical size at
 * any zoom level.
 *
 * Pins are interactive (role=button + onClick) and surface their
 * IATA code in a tiny caps label under the tip. The active pin
 * radiates a two-ring radar pulse + shows "CITY · CODE" above it.
 *
 * Land paths are computed once at module load, not per render — the
 * topology is static and has ~5–10k coordinate pairs at 50m, so
 * paying that cost on every state change would jank the wizard.
 */

import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-50m.json';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { DestinationOption } from '@/store/journeys';

const LAND_TOPOLOGY = landTopo as unknown as Topology;
const LAND_FEATURES = feature(
  LAND_TOPOLOGY,
  LAND_TOPOLOGY.objects.land as GeometryCollection,
) as FeatureCollection;

const LAND_PATH_D = buildLandPath(LAND_FEATURES);

function buildLandPath(fc: FeatureCollection): string {
  const parts: string[] = [];
  for (const f of fc.features) {
    const g = f.geometry as Polygon | MultiPolygon;
    if (g.type === 'Polygon') {
      pushRings(parts, g.coordinates);
    } else if (g.type === 'MultiPolygon') {
      for (const polygon of g.coordinates) {
        pushRings(parts, polygon);
      }
    }
  }
  return parts.join('');
}

function pushRings(parts: string[], rings: number[][][]) {
  for (const ring of rings) {
    let d = '';
    for (let i = 0; i < ring.length; i++) {
      const point = ring[i];
      if (!point || point.length < 2) continue;
      const lng = point[0] as number;
      const lat = point[1] as number;
      // Equirectangular: degrees → viewBox units.
      const x = (lng + 180).toFixed(2);
      const y = (90 - lat).toFixed(2);
      d += (i === 0 ? 'M' : 'L') + x + ',' + y;
    }
    d += 'Z';
    parts.push(d);
  }
}

/** CSS injected once with the component — keyframes can't live in
 *  Tailwind without a config change. Two staggered rings give the
 *  "radar ping" feel; subtle scale + opacity on idle pins. */
const PIN_CSS = `
  @keyframes wm-radar {
    0% { transform: scale(0.2); opacity: 0.6; }
    100% { transform: scale(3); opacity: 0; }
  }
  @keyframes wm-breath {
    0%, 100% { transform: scale(1); opacity: 0.35; }
    50% { transform: scale(1.25); opacity: 0.55; }
  }
  .wm-radar-1, .wm-radar-2 {
    animation: wm-radar 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
    transform-box: fill-box;
    transform-origin: center;
    fill: var(--color-ph-red);
  }
  .wm-radar-2 { animation-delay: 0.6s; }
  .wm-breath {
    animation: wm-breath 3.2s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: center;
    fill: var(--color-ph-red);
  }
`;

interface WorldMapProps {
  destinations: DestinationOption[];
  selectedId: string;
  onPick: (id: string) => void;
  /** When supplied, the map smoothly zooms into this bbox (viewBox
   *  coords). Pins counter-scale so they stay readable. */
  zoomBbox?: { x: number; y: number; w: number; h: number } | null;
  /** Header label — defaults to "World map". */
  title?: string;
  /** Optional back affordance. */
  onBack?: () => void;
}

const WORLD_VIEW = { x: 0, y: 0, w: 360, h: 180 };

export function WorldMap({
  destinations,
  selectedId,
  onPick,
  zoomBbox,
  title = 'World map',
  onBack,
}: WorldMapProps) {
  // Letterbox-fit the bbox into the 360×180 viewBox.
  const target = zoomBbox ?? WORLD_VIEW;
  const scale = Math.min(WORLD_VIEW.w / target.w, WORLD_VIEW.h / target.h);
  const offsetX = (WORLD_VIEW.w - target.w * scale) / 2 - target.x * scale;
  const offsetY = (WORLD_VIEW.h - target.h * scale) / 2 - target.y * scale;

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <style>{PIN_CSS}</style>
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="hover:text-slate-900 dark:hover:text-slate-100"
          >
            ← All regions
          </button>
        ) : (
          <span>{title}</span>
        )}
        <span>Tap a city</span>
      </div>
      <svg
        viewBox="0 0 360 180"
        className="block w-full"
        role="img"
        aria-label={`${title} — tap a city to select`}
      >
        <g
          style={{
            transform: `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px) scale(${scale.toFixed(4)})`,
            transformOrigin: '0 0',
            // Slower, more cinematic curve — the standard "ease-in-out cubic"
            // (a.k.a. cubic-bezier 0.65, 0, 0.35, 1) reads as a deliberate
            // camera move rather than a snappy CSS transition.
            transition: 'transform 1.1s cubic-bezier(0.65, 0, 0.35, 1)',
          }}
        >
          {/* Land silhouette — cool blue-grey so the red pins pop.
              A thin slate-400 outline at 1/scale viewBox-units defines
              the coastline without competing visually. */}
          <path
            d={LAND_PATH_D}
            fillRule="evenodd"
            className="fill-slate-300 stroke-slate-400/60 dark:fill-slate-700 dark:stroke-slate-500/40"
            strokeWidth={0.25 / scale}
            strokeLinejoin="round"
          />

          {destinations.map((d) => {
            const x = d.lng + 180;
            const y = 90 - d.lat;
            const active = d.id === selectedId;
            return (
              <Pin
                key={d.id}
                x={x}
                y={y}
                city={d.city}
                code={d.id.toUpperCase()}
                active={active}
                onClick={() => onPick(d.id)}
                counterScale={scale}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/**
 * MapPin glyph rendered at world (x, y) where (x, y) is the pin's
 * geographic position — the tip of the pin lands there.
 *
 * - Active pin: two radar rings + halo + larger MapPin glyph + label
 *   "CITY · CODE" above
 * - Idle pin:   soft "breath" pulse behind the glyph + tiny IATA code
 *   below the tip
 *
 * `counterScale` is the outer zoom factor — every dimension gets
 * divided by it so the pin renders at a consistent physical size
 * however far we've zoomed.
 */
function Pin({
  x,
  y,
  city,
  code,
  active,
  onClick,
  counterScale,
}: {
  x: number;
  y: number;
  city: string;
  code: string;
  active: boolean;
  onClick: () => void;
  counterScale: number;
}) {
  // Base sizes in viewBox units (counter-scaled so they stay constant).
  const glyphScale = (active ? 0.55 : 0.42) / counterScale;
  const glyphTx = x - 12 * glyphScale;
  const glyphTy = y - 23 * glyphScale;
  const haloR = 4.5 / counterScale;
  const ringR = 2.4 / counterScale;
  const breathR = 2 / counterScale;
  const labelFont = 5.5 / counterScale;
  const codeFont = 3.5 / counterScale;

  return (
    <g
      role="button"
      aria-label={`Select ${city} (${code})`}
      onClick={onClick}
      className="cursor-pointer"
    >
      {active ? (
        <>
          {/* Radar ping rings — two of them, second one half a cycle behind */}
          <circle cx={x} cy={y} r={ringR} className="wm-radar-1" />
          <circle cx={x} cy={y} r={ringR} className="wm-radar-2" />
          {/* Solid halo behind the glyph */}
          <circle cx={x} cy={y} r={haloR} className="fill-[var(--color-ph-red)] opacity-25" />
        </>
      ) : (
        /* Idle "breath" pulse — softer, slower */
        <circle cx={x} cy={y} r={breathR} className="wm-breath" />
      )}

      {/* MapPin glyph (lucide path, viewBox 24×24, tip at (12, 23)) */}
      <g transform={`translate(${glyphTx} ${glyphTy}) scale(${glyphScale})`}>
        <path
          d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0Z"
          className="fill-[var(--color-ph-red)] stroke-white"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="10" r="3" className="fill-white" />
      </g>

      {active ? (
        <text
          x={x}
          y={y - 8 / counterScale}
          textAnchor="middle"
          className="fill-zinc-900 dark:fill-zinc-100"
          style={{
            font: `700 ${labelFont.toFixed(2)}px system-ui, -apple-system, sans-serif`,
            letterSpacing: `${(0.6 / counterScale).toFixed(2)}px`,
          }}
        >
          {city.toUpperCase()} · {code}
        </text>
      ) : (
        <text
          x={x}
          y={y + 5 / counterScale}
          textAnchor="middle"
          className="fill-zinc-600 dark:fill-zinc-300"
          style={{
            font: `700 ${codeFont.toFixed(2)}px system-ui, -apple-system, sans-serif`,
            letterSpacing: `${(0.3 / counterScale).toFixed(2)}px`,
          }}
        >
          {code}
        </text>
      )}
    </g>
  );
}
