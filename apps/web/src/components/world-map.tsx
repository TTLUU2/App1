'use client';

/**
 * WorldMap — stylized destination picker for the Track-a-journey
 * wizard. Continents are rendered from world-atlas's 110m TopoJSON
 * (low-detail land silhouette, ~55KB raw / 15KB gzip — loaded once
 * with the /journeys/track route chunk). Each catalogue entry shows
 * as a lucide-style MapPin at its lat/lng; the active one gets a
 * larger pin + label, matching design-refs/world-map.png.
 *
 * Projection is equirectangular (lng + 180, 90 - lat) over a
 * viewBox of 360×180 — same convention I'd already chosen for the
 * pin math, so feature coordinates flow straight through.
 *
 * Land paths are computed once at module load, not per render — the
 * topology is static and there are ~6k coordinate pairs to walk, so
 * paying that cost on every state change would jank the wizard.
 */

import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { DestinationOption } from '@/store/journeys';

const LAND_TOPOLOGY = landTopo as unknown as Topology;
const LAND_FEATURES = feature(
  LAND_TOPOLOGY,
  LAND_TOPOLOGY.objects.land as GeometryCollection,
) as FeatureCollection;

/** Pre-compute a single concatenated SVG `d` string for every land
 *  ring, projected. Runs at module load — ~130 features in 110m. */
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
      const [lng, lat] = ring[i];
      // Equirectangular: degrees → viewBox units.
      const x = (lng + 180).toFixed(2);
      const y = (90 - lat).toFixed(2);
      d += (i === 0 ? 'M' : 'L') + x + ',' + y;
    }
    d += 'Z';
    parts.push(d);
  }
}

interface WorldMapProps {
  destinations: DestinationOption[];
  selectedId: string;
  onPick: (id: string) => void;
}

export function WorldMap({ destinations, selectedId, onPick }: WorldMapProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        <span>World map</span>
        <span>Tap a city</span>
      </div>
      <svg
        viewBox="0 0 360 180"
        className="block w-full"
        role="img"
        aria-label="World map — tap a city to select"
      >
        <path
          d={LAND_PATH_D}
          fillRule="evenodd"
          className="fill-emerald-400/55 dark:fill-emerald-500/30"
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
              active={active}
              onClick={() => onPick(d.id)}
            />
          );
        })}
      </svg>
    </div>
  );
}

/**
 * MapPin glyph rendered at world (x, y) where (x, y) is the pin's
 * geographic position — the tip of the pin lands there. Path data
 * is lucide's MapPin (viewBox 24×24, tip at (12, 23)); we scale and
 * translate so the tip sits at (x, y) in world coords.
 */
function Pin({
  x,
  y,
  city,
  active,
  onClick,
}: {
  x: number;
  y: number;
  city: string;
  active: boolean;
  onClick: () => void;
}) {
  const scale = active ? 0.55 : 0.42;
  // Lucide MapPin local tip: (12, 23). After scale: (12s, 23s).
  // Translate so the scaled tip lands at (x, y).
  const tx = x - 12 * scale;
  const ty = y - 23 * scale;

  return (
    <g role="button" aria-label={`Select ${city}`} onClick={onClick} className="cursor-pointer">
      {/* Soft halo on active so it pops against the green */}
      {active && <circle cx={x} cy={y} r="4.5" className="fill-[var(--color-ph-red)] opacity-25" />}
      <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
        {/* Pin outline drawn as fill — keeps the silhouette crisp at the small scale */}
        <path
          d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0Z"
          className="fill-[var(--color-ph-red)] stroke-white"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="10" r="3" className="fill-white" />
      </g>
      {active && (
        <text
          x={x + 5}
          y={y - 6}
          className="fill-zinc-900 dark:fill-zinc-100"
          style={{ font: '700 5.5px system-ui, -apple-system, sans-serif' }}
        >
          {city.toUpperCase()}
        </text>
      )}
    </g>
  );
}
