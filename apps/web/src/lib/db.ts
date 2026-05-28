// Browser-only IndexedDB persistence via Dexie.
//
// Two mutable tables in M2:
//   - userCards: the user's card history (added M1)
//   - userBenefitRedemptions: per-period benefit usage records (added M2)
//
// The bundled catalogue (issuers/cards/benefits) ships with @ph/shared and
// is not persisted.
//
// Encryption-at-rest is deferred for v1 internal testing per kickoff
// agreement (see docs/DECISIONS.md). Browser IndexedDB stores card history
// in plain bytes inside the user's profile. PAN/CVV are NEVER written; a
// validator at the store boundary rejects 13–19-digit strings in any field
// other than the dedicated last4 (which must be exactly 4 digits).

import Dexie, { type EntityTable } from 'dexie';
import type { UserCard, UserBenefitRedemption } from '@ph/shared';

class PhDatabase extends Dexie {
  userCards!: EntityTable<UserCard, 'id'>;
  userBenefitRedemptions!: EntityTable<UserBenefitRedemption, 'id'>;

  constructor() {
    super('ph-copilot');
    // v1: userCards only. v2 adds userBenefitRedemptions. Dexie applies
    // migrations in order on open(); existing v1 databases keep their data.
    this.version(1).stores({
      userCards: 'id, cardId, applicationDate, cancellationDate, createdAt',
    });
    this.version(2).stores({
      userCards: 'id, cardId, applicationDate, cancellationDate, createdAt',
      userBenefitRedemptions: 'id, userCardId, benefitId, periodEndDate, redeemedAt',
    });
  }
}

// Single shared connection. Re-created on hot-module-reload via the lazy
// initialiser pattern below so dev iteration doesn't blow up with
// "DatabaseClosedError".
let dbInstance: PhDatabase | null = null;

export function getDb(): PhDatabase {
  if (typeof window === 'undefined') {
    throw new Error('getDb() called on the server. IndexedDB is browser-only.');
  }
  if (!dbInstance) dbInstance = new PhDatabase();
  return dbInstance;
}

/** Test-only: wipe both tables. Used by the dev-menu seeder. */
export async function resetDb(): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.userCards, db.userBenefitRedemptions, async () => {
    await db.userCards.clear();
    await db.userBenefitRedemptions.clear();
  });
}
