'use client';

// Alert Centre state: per-card alert toggles + fired-alerts inbox feed.
// All UI-driven for v1 — no real web push, no backend cron. The feed
// is seeded with realistic alerts that fired across the last few days
// so the inbox is non-empty on first load.

import { create } from 'zustand';

export type AlertKind =
  | 'min-spend-deadline'
  | 'annual-fee-renewal'
  | 'benefit-expiring'
  | 'three-month-to-bonus';

export interface CardAlertPrefs {
  cardId: string;
  cardName: string;
  /** Each kind toggled on/off independently. */
  enabled: Record<AlertKind, boolean>;
}

export interface FiredAlert {
  id: string;
  cardId: string;
  cardName: string;
  kind: AlertKind;
  title: string;
  subtitle: string;
  /** ISO datetime when the alert fired. */
  firedAt: string;
  read: boolean;
}

export interface GlobalAlertPrefs {
  pauseAll: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

const SEED_GLOBAL: GlobalAlertPrefs = {
  pauseAll: false,
  quietHoursEnabled: true,
  quietStart: '21:00',
  quietEnd: '07:00',
};

const SEED_CARDS: CardAlertPrefs[] = [
  {
    cardId: 'amex-platinum',
    cardName: 'Amex Platinum',
    enabled: {
      'min-spend-deadline': true,
      'annual-fee-renewal': true,
      'benefit-expiring': true,
      'three-month-to-bonus': false,
    },
  },
  {
    cardId: 'anz-rewards-black',
    cardName: 'ANZ Rewards Black',
    enabled: {
      'min-spend-deadline': true,
      'annual-fee-renewal': true,
      'benefit-expiring': false,
      'three-month-to-bonus': false,
    },
  },
];

const SEED_FEED: FiredAlert[] = [
  {
    id: 'a1',
    cardId: 'amex-platinum',
    cardName: 'Amex Platinum',
    kind: 'min-spend-deadline',
    title: 'Amex min-spend · $1,240 to go',
    subtitle: '12 days left · tap to log spend',
    firedAt: '2026-06-20T08:30:00+10:00',
    read: false,
  },
  {
    id: 'a2',
    cardId: 'qantas-premier-platinum',
    cardName: 'Qantas Premier Platinum',
    kind: 'benefit-expiring',
    title: 'Qantas Club benefit expiring',
    subtitle: '8 days · $450 value',
    firedAt: '2026-06-20T09:15:00+10:00',
    read: false,
  },
  {
    id: 'a3',
    cardId: 'cba-ultimate',
    cardName: 'CBA Ultimate Awards',
    kind: 'three-month-to-bonus',
    title: "You're now eligible — CBA Ultimate",
    subtitle: '90k bonus · safe to apply',
    firedAt: '2026-06-20T11:00:00+10:00',
    read: true,
  },
  {
    id: 'a4',
    cardId: 'anz-rewards-black',
    cardName: 'ANZ Rewards Black',
    kind: 'annual-fee-renewal',
    title: 'ANZ annual fee in 9 days',
    subtitle: '$375 · review benefits first',
    firedAt: '2026-06-18T07:00:00+10:00',
    read: true,
  },
  {
    id: 'a5',
    cardId: 'velocity-amex',
    cardName: 'Velocity Amex',
    kind: 'benefit-expiring',
    title: 'Velocity benefit reminder',
    subtitle: 'Status credits offer ends 30 Jun',
    firedAt: '2026-06-17T16:45:00+10:00',
    read: true,
  },
];

const STORAGE_KEY = 'ph-alerts-v1';

interface AlertsState {
  global: GlobalAlertPrefs;
  cards: CardAlertPrefs[];
  feed: FiredAlert[];
  /** True once the user has opted-in to push (UI flag for v1). */
  pushOptedIn: boolean;
  /** True once the post-first-card opt-in modal has been shown,
   *  whether accepted or dismissed. Prevents the modal from nagging. */
  pushPrompted: boolean;
  loaded: boolean;

  hydrate: () => void;
  setGlobal: (patch: Partial<GlobalAlertPrefs>) => void;
  setCardAlert: (cardId: string, kind: AlertKind, enabled: boolean) => void;
  setPushOptedIn: (value: boolean) => void;
  markPushPrompted: () => void;
  markRead: (alertId: string) => void;
  markAllRead: () => void;
  reset: () => void;
}

type Persisted = Pick<AlertsState, 'global' | 'cards' | 'feed' | 'pushOptedIn' | 'pushPrompted'>;

const SEED: Persisted = {
  global: SEED_GLOBAL,
  cards: SEED_CARDS,
  feed: SEED_FEED,
  pushOptedIn: false,
  pushPrompted: false,
};

function load(): Persisted {
  if (typeof window === 'undefined') return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      global: { ...SEED.global, ...(parsed.global ?? {}) },
      cards: parsed.cards ?? SEED.cards,
      feed: parsed.feed ?? SEED.feed,
      pushOptedIn: parsed.pushOptedIn ?? false,
      pushPrompted: parsed.pushPrompted ?? false,
    };
  } catch {
    return SEED;
  }
}

function save(state: Persisted) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* fine */
  }
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  ...SEED,
  loaded: false,

  hydrate() {
    if (get().loaded) return;
    set({ ...load(), loaded: true });
  },

  setGlobal(patch) {
    const next = { ...get().global, ...patch };
    set({ global: next });
    save({
      global: next,
      cards: get().cards,
      feed: get().feed,
      pushOptedIn: get().pushOptedIn,
      pushPrompted: get().pushPrompted,
    });
  },

  setCardAlert(cardId, kind, enabled) {
    const next = get().cards.map((c) =>
      c.cardId === cardId ? { ...c, enabled: { ...c.enabled, [kind]: enabled } } : c,
    );
    set({ cards: next });
    save({
      global: get().global,
      cards: next,
      feed: get().feed,
      pushOptedIn: get().pushOptedIn,
      pushPrompted: get().pushPrompted,
    });
  },

  setPushOptedIn(value) {
    set({ pushOptedIn: value });
    save({
      global: get().global,
      cards: get().cards,
      feed: get().feed,
      pushOptedIn: value,
      pushPrompted: get().pushPrompted,
    });
  },

  markPushPrompted() {
    set({ pushPrompted: true });
    save({
      global: get().global,
      cards: get().cards,
      feed: get().feed,
      pushOptedIn: get().pushOptedIn,
      pushPrompted: true,
    });
  },

  markRead(alertId) {
    const next = get().feed.map((a) => (a.id === alertId ? { ...a, read: true } : a));
    set({ feed: next });
    save({
      global: get().global,
      cards: get().cards,
      feed: next,
      pushOptedIn: get().pushOptedIn,
      pushPrompted: get().pushPrompted,
    });
  },

  markAllRead() {
    const next = get().feed.map((a) => ({ ...a, read: true }));
    set({ feed: next });
    save({
      global: get().global,
      cards: get().cards,
      feed: next,
      pushOptedIn: get().pushOptedIn,
      pushPrompted: get().pushPrompted,
    });
  },

  reset() {
    set({ ...SEED });
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* fine */
      }
    }
  },
}));

export function selectUnreadCount(state: AlertsState): number {
  return state.feed.filter((a) => !a.read).length;
}
