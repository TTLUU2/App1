'use client';

// Rewards-program point balances. Single JSON blob in localStorage —
// same shape as user-preferences, since balances are small and rarely
// mutated. Seeded with the four programs the designs reference so the
// new Home / Balances / Journeys screens render meaningful content on
// first boot; user can edit any balance or add/remove programs.

import { create } from 'zustand';

export interface ProgramBalance {
  id: string;
  name: string;
  shortName: string;
  /** Absolute URL to a 32px logo PNG. null = use initials fallback in UI. */
  logoUrl: string | null;
  /** Cents-per-point estimate for value calc. AU averages, conservative. */
  cpp: number;
  balance: number;
  /** ISO yyyy-MM-dd of the last user-confirmed update. null = never. */
  updatedAt: string | null;
}

const CDN = 'https://pointhacks-spa-tools.fly.dev/images/programs-small';

const SEED: ProgramBalance[] = [
  {
    id: 'qantas-ff',
    name: 'Qantas Frequent Flyer',
    shortName: 'Qantas FF',
    logoUrl: `${CDN}/qantas.png`,
    cpp: 1.9,
    balance: 186_400,
    updatedAt: '2026-06-18',
  },
  {
    id: 'velocity',
    name: 'Velocity Frequent Flyer',
    shortName: 'Velocity',
    logoUrl: `${CDN}/velocity.png`,
    cpp: 1.6,
    balance: 94_800,
    updatedAt: '2026-06-18',
  },
  {
    id: 'amex-mr',
    name: 'Amex Membership Rewards',
    shortName: 'Amex MR',
    logoUrl: `${CDN}/amex-mr.png`,
    cpp: 1.5,
    balance: 157_000,
    updatedAt: '2026-06-18',
  },
  {
    id: 'kris-flyer',
    name: 'Singapore KrisFlyer',
    shortName: 'KrisFlyer',
    logoUrl: null,
    cpp: 1.7,
    balance: 0,
    updatedAt: null,
  },
];

const STORAGE_KEY = 'ph-balances-v1';

interface BalancesState {
  programs: ProgramBalance[];
  loaded: boolean;
  hydrate: () => void;
  updateBalance: (id: string, balance: number) => void;
  addProgram: (program: ProgramBalance) => void;
  removeProgram: (id: string) => void;
  reset: () => void;
}

function load(): ProgramBalance[] {
  if (typeof window === 'undefined') return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as ProgramBalance[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED;
  } catch {
    return SEED;
  }
}

function save(programs: ProgramBalance[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
  } catch {
    /* quota / private mode — silently degrade */
  }
}

export const useBalancesStore = create<BalancesState>((set, get) => ({
  programs: SEED,
  loaded: false,

  hydrate() {
    if (get().loaded) return;
    set({ programs: load(), loaded: true });
  },

  updateBalance(id, balance) {
    const today = new Date().toISOString().slice(0, 10);
    const next = get().programs.map((p) => (p.id === id ? { ...p, balance, updatedAt: today } : p));
    set({ programs: next });
    save(next);
  },

  addProgram(program) {
    const exists = get().programs.some((p) => p.id === program.id);
    if (exists) return;
    const next = [...get().programs, program];
    set({ programs: next });
    save(next);
  },

  removeProgram(id) {
    const next = get().programs.filter((p) => p.id !== id);
    set({ programs: next });
    save(next);
  },

  reset() {
    set({ programs: SEED });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* fine */
      }
    }
  },
}));

/** Aggregate selectors — used by Home + Journeys + Balances screens. */
export function selectTotalPoints(state: BalancesState): number {
  return state.programs.reduce((sum, p) => sum + p.balance, 0);
}

export function selectTotalValueAud(state: BalancesState): number {
  return state.programs.reduce((sum, p) => sum + (p.balance * p.cpp) / 100, 0);
}
