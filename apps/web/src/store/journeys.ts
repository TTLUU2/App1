'use client';

// Tracked journeys — destinations the user is saving towards. Created
// by the Track-a-journey wizard, surfaced on the Journeys landing and
// referenced by the Home momentum strip.

import { create } from 'zustand';

export type CabinClass = 'Economy' | 'Premium Economy' | 'Business' | 'First';
export type TripType = 'Return' | 'One-way';

/** Australian departure ports the user can choose from. International
 *  origins outside AU are out of scope for v1 — the points estimates +
 *  award charts assume an AU outbound. */
export interface OriginPort {
  /** Lowercase IATA — matches the destination id convention. */
  id: string;
  city: string;
  state: string;
  airport: string;
}

export const ORIGIN_PORTS: OriginPort[] = [
  { id: 'syd', city: 'Sydney', state: 'NSW', airport: 'Kingsford Smith Airport' },
  { id: 'mel', city: 'Melbourne', state: 'VIC', airport: 'Tullamarine Airport' },
  { id: 'bne', city: 'Brisbane', state: 'QLD', airport: 'Brisbane Airport' },
  { id: 'per', city: 'Perth', state: 'WA', airport: 'Perth Airport' },
  { id: 'adl', city: 'Adelaide', state: 'SA', airport: 'Adelaide Airport' },
  { id: 'cbr', city: 'Canberra', state: 'ACT', airport: 'Canberra Airport' },
  { id: 'ool', city: 'Gold Coast', state: 'QLD', airport: 'Gold Coast Airport' },
  { id: 'cns', city: 'Cairns', state: 'QLD', airport: 'Cairns Airport' },
  { id: 'hba', city: 'Hobart', state: 'TAS', airport: 'Hobart Airport' },
  { id: 'drw', city: 'Darwin', state: 'NT', airport: 'Darwin Airport' },
];

export const DEFAULT_ORIGIN_ID = 'syd';

export type RegionId = 'asia-pacific' | 'europe' | 'americas' | 'mea';

export interface CabinPoints {
  economy: number;
  premiumEconomy: number;
  business: number;
  first: number;
}

export interface DestinationOption {
  /** IATA airport code (lowercase). Used as the React key + URL param + display badge. */
  id: string;
  city: string;
  country: string;
  /** Full airport name — shown in the city detail modal. */
  airport: string;
  region: RegionId;
  /** Approximate return target in points across major AU programs,
   *  per cabin class. Business is the "headline" number used in the
   *  destination tiles + region preview blurbs. */
  pointsByCabin: CabinPoints;
  /** Convenience: pointsByCabin.business — keeps existing callers
   *  working without a rewrite. */
  pointsBusinessReturn: number;
  /** Geographic position (city centre, not airport — same visual
   *  result at the WorldMap viewBox scale). */
  lat: number;
  lng: number;
}

/** Step 1 first shows a region picker. Picking one zooms the map
 *  into that region's bbox (viewBox 360×180, x = lng+180, y = 90-lat). */
export interface RegionDef {
  id: RegionId;
  label: string;
  blurb: string;
  bbox: { x: number; y: number; w: number; h: number };
}

/** Each region's bbox is sized so its cities sit clearly apart in
 *  the frame — not all clumped in a single corner. */
export const REGIONS: RegionDef[] = [
  {
    id: 'asia-pacific',
    label: 'Asia & Pacific',
    blurb: 'Tokyo, Singapore, Bangkok + 6 more',
    // Hanoi → Tokyo: lng 100° → 145°, lat 0° → 40°N
    bbox: { x: 280, y: 50, w: 45, h: 40 },
  },
  {
    id: 'europe',
    label: 'Europe',
    blurb: 'London, Paris, Helsinki + 3 more',
    // Paris → Helsinki: lng −5° → 30°, lat 40°N → 65°N
    bbox: { x: 175, y: 25, w: 35, h: 30 },
  },
  {
    id: 'americas',
    label: 'Americas',
    blurb: 'New York, Toronto, LA + 2 more',
    // Vancouver → NYC: lng −130° → −70°, lat 25°N → 55°N
    bbox: { x: 50, y: 35, w: 60, h: 35 },
  },
  {
    id: 'mea',
    label: 'Middle East & Africa',
    blurb: 'Dubai, Abu Dhabi, Doha',
    // Persian Gulf cluster with a little context
    bbox: { x: 215, y: 55, w: 35, h: 25 },
  },
];

/** Maps a CabinClass display label to its key in CabinPoints. Used
 *  to auto-compute the target points for a journey from the chosen
 *  destination + cabin, replacing the old "pick a target band" step. */
export function cabinKeyFor(cabin: CabinClass): keyof CabinPoints {
  switch (cabin) {
    case 'Economy':
      return 'economy';
    case 'Premium Economy':
      return 'premiumEconomy';
    case 'Business':
      return 'business';
    case 'First':
      return 'first';
  }
}

/** Three-month buffer before the departure month — the date by which
 *  the user actually needs the points so awards can be booked, since
 *  most programs release inventory ~330 days out and good
 *  availability dries up inside 90 days. Returns ISO yyyy-MM, or
 *  null if departureMonth is empty/invalid. */
export function pointsDeadlineForDeparture(departureMonth: string | null): string | null {
  if (!departureMonth) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(departureMonth);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  // Subtract three months by walking the month index.
  const monthIndex = year * 12 + (month - 1) - 3;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonth = (monthIndex % 12) + 1;
  const mm = targetMonth < 10 ? `0${targetMonth}` : String(targetMonth);
  return `${targetYear}-${mm}`;
}

/** Build a per-cabin points table from the Business-return anchor.
 *  Ratios are typical for AU outbound award charts (QFF / Velocity /
 *  Krisflyer / Asia Miles): Economy ≈ Business / 2.7, PE ≈ Business
 *  × 0.7, First ≈ Business × 1.65. Rounded to the nearest 1k for
 *  display tidiness. */
function withCabinPoints(business: number): CabinPoints {
  const round1k = (n: number) => Math.round(n / 1000) * 1000;
  return {
    economy: round1k(business / 2.7),
    premiumEconomy: round1k(business * 0.7),
    business,
    first: round1k(business * 1.65),
  };
}

interface RawDestination {
  id: string;
  city: string;
  country: string;
  airport: string;
  region: RegionId;
  business: number;
  lat: number;
  lng: number;
}

const RAW_DESTINATIONS: RawDestination[] = [
  // ──────────────────────────────────  ASIA & PACIFIC
  {
    id: 'nrt',
    city: 'Tokyo',
    country: 'Japan',
    airport: 'Narita International Airport',
    region: 'asia-pacific',
    business: 216_000,
    lat: 35.69,
    lng: 139.69,
  },
  {
    id: 'kix',
    city: 'Osaka',
    country: 'Japan',
    airport: 'Kansai International Airport',
    region: 'asia-pacific',
    business: 216_000,
    lat: 34.69,
    lng: 135.5,
  },
  {
    id: 'icn',
    city: 'Seoul',
    country: 'South Korea',
    airport: 'Incheon International Airport',
    region: 'asia-pacific',
    business: 198_000,
    lat: 37.55,
    lng: 126.99,
  },
  {
    id: 'hkg',
    city: 'Hong Kong',
    country: 'Hong Kong',
    airport: 'Hong Kong International Airport',
    region: 'asia-pacific',
    business: 120_000,
    lat: 22.3,
    lng: 114.16,
  },
  {
    id: 'sin',
    city: 'Singapore',
    country: 'Singapore',
    airport: 'Singapore Changi Airport',
    region: 'asia-pacific',
    business: 108_000,
    lat: 1.35,
    lng: 103.82,
  },
  {
    id: 'bkk',
    city: 'Bangkok',
    country: 'Thailand',
    airport: 'Suvarnabhumi Airport',
    region: 'asia-pacific',
    business: 144_000,
    lat: 13.74,
    lng: 100.52,
  },
  {
    id: 'kul',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    airport: 'Kuala Lumpur International Airport',
    region: 'asia-pacific',
    business: 132_000,
    lat: 3.14,
    lng: 101.69,
  },
  {
    id: 'sgn',
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
    airport: 'Tan Son Nhat International Airport',
    region: 'asia-pacific',
    business: 144_000,
    lat: 10.82,
    lng: 106.66,
  },
  {
    id: 'han',
    city: 'Hanoi',
    country: 'Vietnam',
    airport: 'Noi Bai International Airport',
    region: 'asia-pacific',
    business: 144_000,
    lat: 21.03,
    lng: 105.85,
  },

  // ──────────────────────────────────  EUROPE
  {
    id: 'lhr',
    city: 'London',
    country: 'UK',
    airport: 'London Heathrow Airport',
    region: 'europe',
    business: 288_000,
    lat: 51.51,
    lng: -0.13,
  },
  {
    id: 'cdg',
    city: 'Paris',
    country: 'France',
    airport: 'Paris Charles de Gaulle Airport',
    region: 'europe',
    business: 288_000,
    lat: 48.86,
    lng: 2.35,
  },
  {
    id: 'fra',
    city: 'Frankfurt',
    country: 'Germany',
    airport: 'Frankfurt Airport',
    region: 'europe',
    business: 288_000,
    lat: 50.11,
    lng: 8.68,
  },
  {
    id: 'ams',
    city: 'Amsterdam',
    country: 'Netherlands',
    airport: 'Amsterdam Schiphol Airport',
    region: 'europe',
    business: 288_000,
    lat: 52.37,
    lng: 4.9,
  },
  {
    id: 'fco',
    city: 'Rome',
    country: 'Italy',
    airport: 'Leonardo da Vinci–Fiumicino Airport',
    region: 'europe',
    business: 288_000,
    lat: 41.9,
    lng: 12.5,
  },
  {
    id: 'hel',
    city: 'Helsinki',
    country: 'Finland',
    airport: 'Helsinki-Vantaa Airport',
    region: 'europe',
    business: 288_000,
    lat: 60.17,
    lng: 24.94,
  },

  // ──────────────────────────────────  AMERICAS
  {
    id: 'lax',
    city: 'Los Angeles',
    country: 'USA',
    airport: 'Los Angeles International Airport',
    region: 'americas',
    business: 196_000,
    lat: 34.05,
    lng: -118.24,
  },
  {
    id: 'jfk',
    city: 'New York',
    country: 'USA',
    airport: 'John F. Kennedy International Airport',
    region: 'americas',
    business: 240_000,
    lat: 40.71,
    lng: -74.01,
  },
  {
    id: 'yvr',
    city: 'Vancouver',
    country: 'Canada',
    airport: 'Vancouver International Airport',
    region: 'americas',
    business: 196_000,
    lat: 49.28,
    lng: -123.12,
  },
  {
    id: 'dfw',
    city: 'Dallas/Fort Worth',
    country: 'USA',
    airport: 'Dallas/Fort Worth International Airport',
    region: 'americas',
    business: 220_000,
    lat: 32.78,
    lng: -96.8,
  },
  {
    id: 'yyz',
    city: 'Toronto',
    country: 'Canada',
    airport: 'Toronto Pearson International Airport',
    region: 'americas',
    business: 240_000,
    lat: 43.65,
    lng: -79.38,
  },

  // ──────────────────────────────────  MIDDLE EAST & AFRICA
  {
    id: 'doh',
    city: 'Doha',
    country: 'Qatar',
    airport: 'Hamad International Airport',
    region: 'mea',
    business: 240_000,
    lat: 25.29,
    lng: 51.53,
  },
  {
    id: 'auh',
    city: 'Abu Dhabi',
    country: 'UAE',
    airport: 'Zayed International Airport',
    region: 'mea',
    business: 240_000,
    lat: 24.47,
    lng: 54.37,
  },
  {
    id: 'dxb',
    city: 'Dubai',
    country: 'UAE',
    airport: 'Dubai International Airport',
    region: 'mea',
    business: 240_000,
    lat: 25.2,
    lng: 55.27,
  },
];

export const DESTINATION_CATALOGUE: DestinationOption[] = RAW_DESTINATIONS.map((d) => ({
  id: d.id,
  city: d.city,
  country: d.country,
  airport: d.airport,
  region: d.region,
  lat: d.lat,
  lng: d.lng,
  pointsBusinessReturn: d.business,
  pointsByCabin: withCabinPoints(d.business),
}));

export interface TrackedJourney {
  id: string;
  /** Lowercase IATA of the AU departure port. Older records that pre-
   *  date this field default to DEFAULT_ORIGIN_ID at read time. */
  originId: string;
  destinationId: string;
  destinationCity: string;
  tripType: TripType;
  cabin: CabinClass;
  /** Number of passengers — multiplies the per-person target. */
  pax: number;
  targetPoints: number;
  /** Departure month, ISO yyyy-MM. null = flexible. */
  departureMonth: string | null;
  /** Frequent-flyer program the user plans to redeem with. */
  programId: string;
  /** ISO datetime when the user pressed Start tracking. */
  createdAt: string;
}

const STORAGE_KEY = 'ph-journeys-v1';

interface JourneysState {
  tracked: TrackedJourney[];
  loaded: boolean;
  hydrate: () => void;
  startTracking: (input: Omit<TrackedJourney, 'id' | 'createdAt'>) => TrackedJourney;
  stopTracking: (id: string) => void;
  reset: () => void;
}

function load(): TrackedJourney[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Partial<TrackedJourney>>;
    if (!Array.isArray(parsed)) return [];
    // Backfill originId for records created before the field existed.
    return parsed.map((j) => ({
      ...(j as TrackedJourney),
      originId: j.originId ?? DEFAULT_ORIGIN_ID,
    }));
  } catch {
    return [];
  }
}

function save(tracked: TrackedJourney[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tracked));
  } catch {
    /* fine */
  }
}

export const useJourneysStore = create<JourneysState>((set, get) => ({
  tracked: [],
  loaded: false,

  hydrate() {
    if (get().loaded) return;
    set({ tracked: load(), loaded: true });
  },

  startTracking(input) {
    const journey: TrackedJourney = {
      ...input,
      id: `j_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const next = [journey, ...get().tracked];
    set({ tracked: next });
    save(next);
    return journey;
  },

  stopTracking(id) {
    const next = get().tracked.filter((j) => j.id !== id);
    set({ tracked: next });
    save(next);
  },

  reset() {
    set({ tracked: [] });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* fine */
      }
    }
  },
}));
