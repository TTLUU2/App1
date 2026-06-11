# CLAUDE.md

Working rules for AI assistants on this repo. Read this BEFORE touching code in a new session.

## Project

Point Hacks Copilot — AU credit-card eligibility & points-optimisation assistant. Mobile-first PWA wrapped in Capacitor for iOS TestFlight.

- Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind
- Monorepo: pnpm workspace, `apps/web` is the main app, `packages/shared` is shared types
- Backend: API routes on Vercel + Neon Postgres via Drizzle ORM
- iOS: Capacitor 8 (SPM-based, no CocoaPods) → Codemagic CI → TestFlight
- Voice: ElevenLabs TTS + Scribe STT via `/api/tts` and `/api/transcribe` proxies
- See `docs/TODO.md` for the active backlog and `docs/CAPACITOR_TESTFLIGHT.md` for the iOS build pipeline

## Must-not-forget rules

### Deploy safety

**Before any `vercel deploy` (or any `vercel` write command), ALWAYS run `vercel whoami` and verify the active team is `pointhacks` (scope id `pointhacks-1360`).** The project lives under the `pointhacks` team owned by `pointhacks@yotta.ai`. Past sessions have nearly deployed to a personal `ttluu2-9771` account by accident. If `whoami` shows the wrong scope, run `vercel login pointhacks@yotta.ai` and re-check before proceeding.

If a user asks for a deploy, confirm the scope in your reply before running the command — don't just deploy.

**For visible feature changes (new UI surfaces, mascots, tabs, big behaviour shifts), ASK before deploying to production.** Bug fixes and quality lifts can deploy reactively; new visible features may collide with a planned demo or staged rollout. Don't infer "we built it so we should ship it." The user's plans aren't visible to you.

### Build / dev

- **Webpack only, no Turbopack.** Turbopack kills the user's local machine. `next dev --webpack` and `next build` (defaults to webpack in this setup).
- **pnpm only, no npm or yarn.** `packageManager` field pins pnpm@10.33.1.
- **Don't amend commits.** Always create new commits — `--amend` after a pre-commit hook failure can clobber prior work.
- **Don't skip git hooks.** No `--no-verify`, no `--no-gpg-sign`.

### UI

- **All icons via `lucide-react` — never emoji characters in UI strings.** This is strict; emojis in `.tsx` are rejected on review.
- en-AU formatting throughout. Spoken dates use full month names.

### Security

- **PAN and CVV are never captured, stored, or transmitted.** There's a validator at the store boundary; don't relax it.
- Encryption-at-rest waived for v1 (internal testing only).
- Direct Anthropic API key (`ANTHROPIC_API_KEY`) — **not** Vercel AI Gateway.

### iOS / TestFlight

Today's hard-learned lessons (full pain log in `docs/TODO.md` and `docs/CAPACITOR_TESTFLIGHT.md`):

- App Store Connect API key role must be **Admin** for first-time Distribution cert creation (not Developer, not App Manager).
- Code signing needs `openssl genrsa` to generate a private key BEFORE `app-store-connect fetch-signing-files --certificate-key=@file:...` — without the local key, Apple's API can't bind a new cert.
- Capacitor 8 uses **Swift Package Manager**, not CocoaPods. No Podfile, no `.xcworkspace` — use `--project App.xcodeproj` for xcodebuild.
- Node 22+ required (Capacitor 8 CLI floor).
- pnpm 10 blocks postinstall scripts for nested packages — `sharp` and friends are whitelisted via `pnpm.onlyBuiltDependencies` in root `package.json`. Add to that list if a build complains about a missing native module.
- TestFlight invitee's signed-in Apple ID must match the invited email — different ID → invisible app.

### CI triggers

- `mobile/*` branches → Codemagic builds the iOS .ipa and ships to TestFlight
- `main` → Vercel deploys the web app (or it's supposed to — GitHub→Vercel auto-deploy is flaky, currently shipping via `vercel deploy --prod` CLI; see TODO)

## When unsure

Read `docs/TODO.md` for current state and `docs/DECISIONS.md` for past architectural calls. Ask the user before making large refactors. Don't grow scope without confirmation.
