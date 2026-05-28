'use client';

import { useEffect } from 'react';
import { useUserCardsStore } from '@/store/user-cards';
import { useUserBenefitsStore } from '@/store/user-benefits';

/**
 * Loads both Zustand stores (UserCards + UserBenefitRedemptions) from
 * IndexedDB on first mount. Renders nothing. Mounted once at the root
 * layout level so the stores are ready before any tab renders.
 */
export function StoreHydrator() {
  useEffect(() => {
    void useUserCardsStore.getState().load();
    void useUserBenefitsStore.getState().load();
  }, []);
  return null;
}
