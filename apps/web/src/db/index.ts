// Lazy Drizzle + Neon client. Two important constraints baked in:
//
// 1. **Lazy init** — `neon()` throws if DATABASE_URL is missing. Next.js
//    evaluates top-level module code at build time, so a top-level
//    `neon(process.env.DATABASE_URL!)` crashes `next build` whenever the
//    env var isn't yet populated (e.g. CI without DB access). The
//    `getDb()` factory defers the call until the first request.
//
// 2. **No Proxy wrappers** — a `new Proxy(db, …)` lazy wrapper would
//    intercept property checks done by Auth libs / drizzle internals and
//    silently break things. We use a plain module-level `let` cache.

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type Db = ReturnType<typeof createDb>;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Pull env vars with `vercel env pull apps/web/.env.local --yes`.',
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

let cached: Db | null = null;

export function getDb(): Db {
  if (!cached) cached = createDb();
  return cached;
}

// Re-export schema so callers don't double-import.
export * as schema from './schema';
