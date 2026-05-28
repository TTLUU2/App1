'use client';

import { useEffect } from 'react';
import { useUserCardsStore } from '@/store/user-cards';

/**
 * Loads the user-card store from IndexedDB on first mount. Renders nothing.
 * Mounted once at the root layout level so the store is ready before any
 * tab renders.
 */
export function StoreHydrator() {
  useEffect(() => {
    void useUserCardsStore.getState().load();
  }, []);
  return null;
}
