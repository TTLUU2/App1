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

// Server → local program-id mapping. The email parser emits the shorter
// canonical ids ('qantas', 'velocity', 'amex_mr', 'krisflyer'); the
// local Zustand store uses UI-facing slugs. Keep this in one place so
// there's a single truth for the mapping — new programs land here first
// when the parser learns to recognise them.
const SERVER_TO_LOCAL_ID: Record<string, string> = {
  qantas: 'qantas-ff',
  velocity: 'velocity',
  amex_mr: 'amex-mr',
  krisflyer: 'kris-flyer',
};

interface BalancesState {
  programs: ProgramBalance[];
  loaded: boolean;
  hydrate: () => void;
  updateBalance: (id: string, balance: number) => void;
  /** Pull the newest server-known balance per program (from the email-
   *  sync backend at /api/balances/latest) and merge into the local
   *  store. Server value replaces local whenever the server row is
   *  newer than the local `updatedAt`. Silent on network failure —
   *  the local values stay, and we retry next time the screen mounts. */
  syncFromServer: (deviceId: string) => Promise<void>;
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

  async syncFromServer(deviceId) {
    try {
      const res = await fetch(`/api/balances/latest?deviceId=${encodeURIComponent(deviceId)}`);
      if (!res.ok) return;
      const json = (await res.json()) as {
        balances?: Array<{ programId: string; balance: number; receivedAt: string }>;
      };
      const serverBalances = json.balances ?? [];
      if (serverBalances.length === 0) return;

      const now = get().programs;
      let mutated = false;
      const next = now.map((p) => {
        // Find a server row whose canonical program id maps to this
        // local id. We don't rewrite the local id ('qantas-ff' stays
        // 'qantas-ff') — only the balance + updatedAt come from the
        // server.
        const serverRow = serverBalances.find((s) => SERVER_TO_LOCAL_ID[s.programId] === p.id);
        if (!serverRow) return p;
        const serverDate = serverRow.receivedAt.slice(0, 10);
        // Server wins when it's newer than the local record OR the
        // local record has never been updated (updatedAt === null).
        // A local edit made TODAY after a server sync will still win
        // because `updateBalance` stamps `updatedAt` to today, which
        // is >= serverDate for today's server rows.
        if (p.updatedAt && p.updatedAt > serverDate) return p;
        if (p.balance === serverRow.balance && p.updatedAt === serverDate) return p;
        mutated = true;
        return { ...p, balance: serverRow.balance, updatedAt: serverDate };
      });
      if (mutated) {
        set({ programs: next });
        save(next);
      }
    } catch {
      /* network / parse — silent, retry next mount */
    }
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
