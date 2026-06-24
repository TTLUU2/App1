'use client';

import { useEffect } from 'react';
import { useUserCardsStore } from '@/store/user-cards';
import { useUserBenefitsStore } from '@/store/user-benefits';
import { useUserPreferencesStore } from '@/store/user-preferences';
import { useBalancesStore } from '@/store/balances';
import { useAlertsStore } from '@/store/alerts';
import { useJourneysStore } from '@/store/journeys';

/**
 * Loads all client-side stores on first mount. UserCards and benefit
 * redemptions come from IndexedDB; preferences come from localStorage
 * (a single small JSON blob — doesn't need a Dexie table). Renders
 * nothing. Mounted once at the root layout level so the stores are
 * ready before any tab renders.
 */
export function StoreHydrator() {
  useEffect(() => {
    void useUserCardsStore.getState().load();
    void useUserBenefitsStore.getState().load();
    useUserPreferencesStore.getState().hydrate();
    useBalancesStore.getState().hydrate();
    useAlertsStore.getState().hydrate();
    useJourneysStore.getState().hydrate();
  }, []);
  return null;
}
