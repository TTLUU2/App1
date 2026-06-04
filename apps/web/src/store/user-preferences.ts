'use client';

// User preferences for Tab 4 ranking — preferred rewards programs (soft
// boost) and card type (hard filter). Stored in localStorage as a single
// JSON blob; tiny, one-row-equivalent of state so we skip Dexie/IndexedDB.
//
// Defaults are deliberately permissive (no program preference, personal
// cards only) so the app works on first run with zero input. The
// preferences modal nudges the user to set programs explicitly.

import { create } from 'zustand';
import {
  DEFAULT_USER_PREFERENCES,
  type RewardsProgram,
  type UserPreferences,
  type CardTypePreference,
} from '@ph/shared';

const STORAGE_KEY = 'ph-user-preferences-v1';

interface UserPreferencesStore {
  preferences: UserPreferences;
  /** True once the initial localStorage hydration ran. */
  loaded: boolean;
  /** Set on first visit when the user has never opened the prefs modal. */
  promptedAt: string | null;
  hydrate: () => void;
  setPrograms: (programs: RewardsProgram[]) => void;
  setCardType: (cardType: CardTypePreference) => void;
  markPrompted: () => void;
  reset: () => void;
}

function load(): { preferences: UserPreferences; promptedAt: string | null } {
  if (typeof window === 'undefined') {
    return { preferences: DEFAULT_USER_PREFERENCES, promptedAt: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { preferences: DEFAULT_USER_PREFERENCES, promptedAt: null };
    const parsed = JSON.parse(raw) as Partial<{
      preferences: UserPreferences;
      promptedAt: string | null;
    }>;
    return {
      preferences: { ...DEFAULT_USER_PREFERENCES, ...(parsed.preferences ?? {}) },
      promptedAt: parsed.promptedAt ?? null,
    };
  } catch {
    return { preferences: DEFAULT_USER_PREFERENCES, promptedAt: null };
  }
}

function save(state: { preferences: UserPreferences; promptedAt: string | null }) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota — silently degrade */
  }
}

export const useUserPreferencesStore = create<UserPreferencesStore>((set, get) => ({
  preferences: DEFAULT_USER_PREFERENCES,
  loaded: false,
  promptedAt: null,

  hydrate() {
    if (get().loaded) return;
    const { preferences, promptedAt } = load();
    set({ preferences, promptedAt, loaded: true });
  },

  setPrograms(programs) {
    const next = { ...get().preferences, preferredPrograms: programs };
    set({ preferences: next });
    save({ preferences: next, promptedAt: get().promptedAt });
  },

  setCardType(cardType) {
    const next = { ...get().preferences, cardType };
    set({ preferences: next });
    save({ preferences: next, promptedAt: get().promptedAt });
  },

  markPrompted() {
    const promptedAt = new Date().toISOString();
    set({ promptedAt });
    save({ preferences: get().preferences, promptedAt });
  },

  reset() {
    set({ preferences: DEFAULT_USER_PREFERENCES, promptedAt: null });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* fine */
      }
    }
  },
}));
