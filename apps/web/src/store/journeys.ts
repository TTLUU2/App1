'use client';

// Tracked journeys — destinations the user is saving towards. Created
// by the Track-a-journey wizard, surfaced on the Journeys landing and
// referenced by the Home momentum strip.

import { create } from 'zustand';

export type CabinClass = 'Economy' | 'Premium Economy' | 'Business' | 'First';
export type TripType = 'Return' | 'One-way';

export interface DestinationOption {
  id: string;
  city: string;
  country: string;
  /** Approximate Business return target in points across major AU programs. */
  pointsBusinessReturn: number;
}

/** Static catalogue shown in step 1 of the wizard. */
export const DESTINATION_CATALOGUE: DestinationOption[] = [
  { id: 'nrt', city: 'Tokyo', country: 'Japan', pointsBusinessReturn: 216_000 },
  { id: 'lhr', city: 'London', country: 'UK', pointsBusinessReturn: 288_000 },
  { id: 'cdg', city: 'Paris', country: 'France', pointsBusinessReturn: 288_000 },
  { id: 'lax', city: 'Los Angeles', country: 'USA', pointsBusinessReturn: 196_000 },
  { id: 'sin', city: 'Singapore', country: 'Singapore', pointsBusinessReturn: 108_000 },
  { id: 'hkg', city: 'Hong Kong', country: 'Hong Kong', pointsBusinessReturn: 120_000 },
];

export interface TrackedJourney {
  id: string;
  destinationId: string;
  destinationCity: string;
  tripType: TripType;
  cabin: CabinClass;
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
