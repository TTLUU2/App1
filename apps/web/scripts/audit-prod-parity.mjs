#!/usr/bin/env node
// Audits whether the code that iOS actually loads (Vercel production
// alias, per capacitor.config.ts) matches the current branch head.
//
// Why this exists: our iOS app is a thin WKWebView shell pointing at a
// fixed URL. A TestFlight rebuild only re-versions the shell — the UI
// is whatever prod is serving. It's therefore easy to think "we
// shipped feature X because build 27 is out" when in reality feature X
// is on a feature branch that never landed on prod, so iOS still shows
// the old UI. This script exists to catch that class of mistake before
// anyone (human or AI) claims something is "on iOS".
//
// What it does:
//   1. Reads the server URL from apps/web/capacitor.config.ts
//   2. Compares HEAD against main — how many commits ahead, which
//      files those commits touch (UI-only vs docs-only matters)
//   3. Prints a report + exits non-zero if there's a real drift
//
// Usage:
//   pnpm --filter @ph/web audit:prod-parity
//   node apps/web/scripts/audit-prod-parity.mjs
//
// Exit codes:
//   0 — parity OK (branch = main, or branch only ahead of main by
//       docs/config commits)
//   1 — drift: branch has UI/code commits that are NOT on prod
//   2 — script error (couldn't read config, git missing, etc.)

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, '..'); // apps/web
const REPO_ROOT = resolve(APP_ROOT, '../..');

// ── styling ──────────────────────────────────────────────────────────
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function fail(msg) {
  console.error(`${RED}${BOLD}✗ ${msg}${RESET}`);
  process.exit(2);
}

// ── 1. read the iOS shell's server URL ───────────────────────────────
let capConfig;
try {
  capConfig = readFileSync(resolve(APP_ROOT, 'capacitor.config.ts'), 'utf8');
} catch (err) {
  fail(`couldn't read capacitor.config.ts: ${err.message}`);
}
const urlMatch = capConfig.match(/url:\s*process\.env\.\w+\s*\?\?\s*['"]([^'"]+)['"]/);
const shellUrl = urlMatch?.[1] ?? '(unknown — server.url pattern changed?)';

// ── 2. git parity check ──────────────────────────────────────────────
function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

let currentBranch, headSha, mainSha, aheadCount, aheadLog;
try {
  currentBranch = git('rev-parse --abbrev-ref HEAD');
  headSha = git('rev-parse --short HEAD');
  mainSha = git('rev-parse --short main');
  aheadCount = parseInt(git('rev-list --count main..HEAD'), 10);
  aheadLog = aheadCount > 0 ? git('log --oneline main..HEAD') : '';
} catch (err) {
  fail(`git command failed: ${err.message}`);
}

// Classify the commits ahead: does anything TOUCH the web app (as
// opposed to docs/CI/scripts)? Docs-only drift is fine — iOS never
// serves the docs. Anything under apps/web/src/ is UI/code and
// MUST be on prod.
let uiCommitCount = 0;
if (aheadCount > 0) {
  const changedFiles = git('diff --name-only main..HEAD');
  const uiTouched = changedFiles
    .split('\n')
    .filter((f) => /^apps\/web\/(src|public|next\.config|tailwind|postcss|package\.json)/.test(f));
  if (uiTouched.length > 0) {
    // A commit "touches UI" if it changed any of the paths above.
    // Simplification: any commit ahead is treated as UI if uiTouched
    // is non-empty, since one bad commit is enough to break parity.
    uiCommitCount = aheadCount;
  }
}

// ── 3. report ────────────────────────────────────────────────────────
console.log(`${BOLD}iOS ↔ prod parity audit${RESET}`);
console.log(`${DIM}────────────────────────${RESET}`);
console.log(`  iOS shell URL      : ${shellUrl}`);
console.log(`  current branch     : ${currentBranch} @ ${headSha}`);
console.log(`  main               : ${mainSha}`);
console.log(`  commits ahead      : ${aheadCount}`);
console.log(`  UI/code commits    : ${uiCommitCount}`);

if (aheadCount === 0) {
  console.log(`\n${GREEN}${BOLD}✓ Parity OK.${RESET} Current branch is at main. iOS is serving what you're editing (assuming main is deployed to prod).\n`);
  process.exit(0);
}

if (uiCommitCount === 0) {
  console.log(`\n${YELLOW}${BOLD}⚠ Branch is ahead of main, but only by docs/config.${RESET}`);
  console.log(`  iOS parity is not affected. Commits ahead:\n`);
  console.log(aheadLog.split('\n').map((l) => `    ${DIM}${l}${RESET}`).join('\n'));
  console.log();
  process.exit(0);
}

console.log(`\n${RED}${BOLD}✗ DRIFT.${RESET} ${uiCommitCount} UI/code commit(s) on this branch are NOT on prod.`);
console.log(`  iOS is serving ${shellUrl}, which tracks main.`);
console.log(`  Users on TestFlight will NOT see these changes until prod ships:\n`);
console.log(aheadLog.split('\n').map((l) => `    ${RED}${l}${RESET}`).join('\n'));
console.log(`\n${BOLD}How to ship${RESET}`);
console.log(`  • Fast path — deploy this branch to prod directly:`);
console.log(`      ${DIM}vercel whoami${RESET}   ${DIM}# confirm scope: pointhacks${RESET}`);
console.log(`      ${DIM}vercel deploy --prod${RESET}   ${DIM}# from repo root${RESET}`);
console.log(`  • Clean path — merge to main first, then deploy.`);
console.log();
process.exit(1);
