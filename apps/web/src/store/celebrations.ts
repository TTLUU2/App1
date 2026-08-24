'use client';

// Celebrations — tracks which "Perry moments" have already fired so
// each celebration shows exactly once per entity, ever. HANDOFF § 10:
// "A mascot who speaks four times a month is a character; one who
// speaks on every screen is a cursor." Persisted to localStorage so a
// reload or a fresh session doesn't re-trigger a moment the user has
// already seen.
//
// Two moments right now:
//   - Bonus cleared: fires once per userCard.id the first time its
//     min-spend hits target (or bonusReceived flips true).
//   - Destination unlocked: fires once per trackedJourney.id the first
//     time the user's Qantas/Velocity balance reaches the target.
//
// Adding a third moment: add a new set to the state, a new action,
// and a new selector — no shared logic to break.
//
// Race safety: the store is the single source of truth. The overlay
// component owns "which moment is currently showing" as local state,
// but "has this fired ever" lives here. That way a mount → check →
// fire sequence can't double-fire from a StrictMode double-mount:
// markBonusCleared() is idempotent on the id set.

import { create } from 'zustand';

const STORAGE_KEY = 'ph-celebrations-v1';

interface Persisted {
  bonusCleared: string[]; // userCard.id
  destinationUnlocked: string[]; // trackedJourney.id
}

interface CelebrationsState {
  bonusCleared: Set<string>;
  destinationUnlocked: Set<string>;
  loaded: boolean;
  hydrate: () => void;
  hasBonusCleared: (userCardId: string) => boolean;
  markBonusCleared: (userCardId: string) => void;
  hasDestinationUnlocked: (trackedJourneyId: string) => boolean;
  markDestinationUnlocked: (trackedJourneyId: string) => void;
  /** Reset all — for QA / "let me see it again" cases. Not wired into
   *  UI today; call from the console when demoing. */
  reset: () => void;
}

function load(): Persisted {
  if (typeof window === 'undefined') return { bonusCleared: [], destinationUnlocked: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { bonusCleared: [], destinationUnlocked: [] };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      bonusCleared: Array.isArray(parsed.bonusCleared) ? parsed.bonusCleared : [],
      destinationUnlocked: Array.isArray(parsed.destinationUnlocked)
        ? parsed.destinationUnlocked
        : [],
    };
  } catch {
    return { bonusCleared: [], destinationUnlocked: [] };
  }
}

function save(state: { bonusCleared: Set<string>; destinationUnlocked: Set<string> }) {
  if (typeof window === 'undefined') return;
  try {
    const payload: Persisted = {
      bonusCleared: Array.from(state.bonusCleared),
      destinationUnlocked: Array.from(state.destinationUnlocked),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* fine — private-mode Safari, quota, etc. */
  }
}

export const useCelebrationsStore = create<CelebrationsState>((set, get) => ({
  bonusCleared: new Set(),
  destinationUnlocked: new Set(),
  loaded: false,

  hydrate() {
    if (get().loaded) return;
    const persisted = load();
    set({
      bonusCleared: new Set(persisted.bonusCleared),
      destinationUnlocked: new Set(persisted.destinationUnlocked),
      loaded: true,
    });
  },

  hasBonusCleared(userCardId) {
    return get().bonusCleared.has(userCardId);
  },

  markBonusCleared(userCardId) {
    const { bonusCleared, destinationUnlocked } = get();
    if (bonusCleared.has(userCardId)) return; // idempotent
    const next = new Set(bonusCleared);
    next.add(userCardId);
    set({ bonusCleared: next });
    save({ bonusCleared: next, destinationUnlocked });
  },

  hasDestinationUnlocked(trackedJourneyId) {
    return get().destinationUnlocked.has(trackedJourneyId);
  },

  markDestinationUnlocked(trackedJourneyId) {
    const { bonusCleared, destinationUnlocked } = get();
    if (destinationUnlocked.has(trackedJourneyId)) return; // idempotent
    const next = new Set(destinationUnlocked);
    next.add(trackedJourneyId);
    set({ destinationUnlocked: next });
    save({ bonusCleared, destinationUnlocked: next });
  },

  reset() {
    set({ bonusCleared: new Set(), destinationUnlocked: new Set() });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* fine */
      }
    }
  },
}));
