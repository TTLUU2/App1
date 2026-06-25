'use client';

// Tracked journeys — destinations the user is saving towards. Created
// by the Track-a-journey wizard, surfaced on the Journeys landing and
// referenced by the Home momentum strip.

import { create } from 'zustand';

export type CabinClass = 'Economy' | 'Premium Economy' | 'Business' | 'First';
export type TripType = 'Return' | 'One-way';

export type RegionId = 'asia-pacific' | 'europe' | 'americas' | 'mea';

export interface DestinationOption {
  id: string;
  city: string;
  country: string;
  /** Approximate Business return target in points across major AU programs. */
  pointsBusinessReturn: number;
  /** Geographic position — drives the SVG map pin location in Step 1. */
  lat: number;
  lng: number;
  /** Which region card the destination lives behind in Step 1. */
  region: RegionId;
}

/** Step 1 first shows a region picker. Picking one zooms the map
 *  into that region's bbox (viewBox 360×180, x = lng+180, y = 90-lat). */
export interface RegionDef {
  id: RegionId;
  label: string;
  blurb: string;
  bbox: { x: number; y: number; w: number; h: number };
}

export const REGIONS: RegionDef[] = [
  {
    id: 'asia-pacific',
    label: 'Asia & Pacific',
    blurb: 'Tokyo, Singapore, Hong Kong',
    bbox: { x: 220, y: 20, w: 130, h: 130 },
  },
  {
    id: 'europe',
    label: 'Europe',
    blurb: 'London, Paris',
    bbox: { x: 160, y: 10, w: 70, h: 60 },
  },
  {
    id: 'americas',
    label: 'Americas',
    blurb: 'Los Angeles',
    bbox: { x: 10, y: 10, w: 140, h: 140 },
  },
  {
    id: 'mea',
    label: 'Middle East & Africa',
    blurb: 'Coming soon',
    bbox: { x: 165, y: 50, w: 80, h: 90 },
  },
];

/** Static catalogue shown in step 1 of the wizard. lat/lng are
 *  approximate airport coordinates, used for the inline world-map
 *  pin placement (equirectangular projection). */
export const DESTINATION_CATALOGUE: DestinationOption[] = [
  {
    id: 'nrt',
    city: 'Tokyo',
    country: 'Japan',
    pointsBusinessReturn: 216_000,
    lat: 35.6,
    lng: 139.7,
    region: 'asia-pacific',
  },
  {
    id: 'lhr',
    city: 'London',
    country: 'UK',
    pointsBusinessReturn: 288_000,
    lat: 51.5,
    lng: -0.1,
    region: 'europe',
  },
  {
    id: 'cdg',
    city: 'Paris',
    country: 'France',
    pointsBusinessReturn: 288_000,
    lat: 48.9,
    lng: 2.4,
    region: 'europe',
  },
  {
    id: 'lax',
    city: 'Los Angeles',
    country: 'USA',
    pointsBusinessReturn: 196_000,
    lat: 34.0,
    lng: -118.4,
    region: 'americas',
  },
  {
    id: 'sin',
    city: 'Singapore',
    country: 'Singapore',
    pointsBusinessReturn: 108_000,
    lat: 1.3,
    lng: 103.8,
    region: 'asia-pacific',
  },
  {
    id: 'hkg',
    city: 'Hong Kong',
    country: 'Hong Kong',
    pointsBusinessReturn: 120_000,
    lat: 22.3,
    lng: 114.2,
    region: 'asia-pacific',
  },
];

export interface TrackedJourney {
  id: string;
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
    const parsed = JSON.parse(raw) as TrackedJourney[];
    return Array.isArray(parsed) ? parsed : [];
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
