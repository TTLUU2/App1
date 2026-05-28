// Browser-only IndexedDB persistence via Dexie.
// Single mutable entity in M1: UserCard. The bundled catalogue (issuers/cards)
// ships with @ph/shared and is not persisted.
//
// Encryption-at-rest is deferred for v1 internal testing per kickoff
// agreement (see docs/DECISIONS.md). Browser IndexedDB stores card history
// in plain bytes inside the user's profile. PAN/CVV are NEVER written; a
// validator at the store boundary rejects 13–19-digit strings in any field
// other than the dedicated last4 (which must be exactly 4 digits).

import Dexie, { type EntityTable } from 'dexie';
import type { UserCard } from '@ph/shared';

class PhDatabase extends Dexie {
  userCards!: EntityTable<UserCard, 'id'>;

  constructor() {
    super('ph-copilot');
    this.version(1).stores({
      // Primary key first; the rest are indexes for filtering.
      userCards: 'id, cardId, applicationDate, cancellationDate, createdAt',
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

/** Test-only: wipe the database. Used by the dev-menu seeder. */
export async function resetDb(): Promise<void> {
  const db = getDb();
  await db.userCards.clear();
}
