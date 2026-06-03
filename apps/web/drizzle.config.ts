// drizzle-kit config — used by `pnpm db:generate` (create migration SQL),
// `pnpm db:push` (apply schema directly to Neon, no migration files), and
// `pnpm db:studio` (browse the DB).
//
// Note: drizzle-kit doesn't auto-load .env.local — the npm scripts wrap it
// with `dotenv -e .env.local --` so DATABASE_URL is in env when this runs.

import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  // Verbose output during dev — surfaces what's about to be applied.
  // strict=false because we run pushes from a non-TTY shell; the verbose
  // SQL dump above gives the same review surface.
  verbose: true,
  strict: false,
} satisfies Config;
