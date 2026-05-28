import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // NOTE: bundler choice is enforced via the `--webpack` CLI flag in package.json
  // scripts. The `bundler: 'webpack'` config key suggested in older docs is
  // rejected as "Unrecognized key" by Next.js 16.2.6.
  //
  // We opted out of Turbopack because on this machine it spawned 30+ worker
  // processes and pegged the system. Revisit when Turbopack's worker count is
  // configurable or Next ships a fix.

  // Compile the workspace package from source (it ships .ts via `main`/`exports`).
  transpilePackages: ['@ph/shared'],

  // Pin the workspace root so Next doesn't pick up a stray lockfile elsewhere
  // on the machine (silences the "inferred workspace root" warning).
  outputFileTracingRoot: resolve(here, '..', '..'),
};

export default nextConfig;
