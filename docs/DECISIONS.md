# Decisions & assumptions — M0 + M1

Every non-trivial choice made during the M0 + M1 run, plus every place the
deliverable deviates from the kickoff prompt or the PRD. Read alongside
`docs/Claude_Code_Kickoff_Prompt.md` and `docs/PointHacksCopilot_PRD_v1.0.docx`.

---

## 1. Pivot from React Native to Next.js web

**Kickoff said:** React Native via Expo (PRD §22.1). M3 covers camera OCR.

**We built:** Next.js 16 web app on webpack. Camera OCR pulled forward into M1.

**Why:** Mid-run the user asked for "a version hosted as a web app with URL
first to test camera and scan cards". After unpacking trade-offs (no
native-build tax, browser `getUserMedia` for camera, deploy on push,
shared engine still pure TS so it ports unchanged), we agreed the web
prototype was the fastest path to validate the riskiest unknown (OCR
accuracy on AU cards). User explicitly confirmed: native deferred, web first.

**What this costs:** Bottom tabs, FAB sheet, gestures must be re-implemented
in native idioms when M5+ ships the native build. Push notifications,
biometrics, on-device encryption all wait for native. The engine,
catalogue, types, and OCR endpoint design carry forward unchanged.

---

## 2. Encryption-at-rest waived

**Kickoff said:** "Encrypt at rest" is non-negotiable.

**We built:** Plain IndexedDB via Dexie. No encryption.

**Why:** User explicitly waived: "don't need encryption for first version,
only internal testing." When we move to native and start onboarding real
users, swap Dexie for `op-sqlite + SQLCipher` (key in `expo-secure-store`)
or stay on IndexedDB and add SubtleCrypto-based field-level encryption.
The data shape doesn't change.

---

## 3. Bundler: webpack, not Turbopack

**Default in Next.js 16:** Turbopack.

**We use:** `next dev --webpack` and `next build --webpack`.

**Why:** Turbopack on this machine spawned 30+ worker processes (observed
PIDs 36972–37002 in the dev-server log) and pegged the system to the point
the previous Claude session ran out of time and exited. User asked us to
stop using Turbopack. Webpack is slower per compile but lighter on CPU/RAM.

**Note for future:** The Turbopack skill's documented escape hatch
(`bundler: 'webpack'` in next.config) is **rejected** as "Unrecognized
key" by Next.js 16.2.6 — only the `--webpack` CLI flag works.

---

## 4. Monorepo tool: pnpm workspaces

**Picked over:** npm workspaces.

**Why:** Strict module resolution catches dep leakage; `workspace:*`
protocol is mature; pnpm's content-addressable store is smaller.

**Gotcha:** pnpm 10 requires explicit approval for native build scripts.
We approved esbuild (for Vitest) via `onlyBuiltDependencies` in
`pnpm-workspace.yaml`.

---

## 5. ESLint major-version split

**Root:** ESLint 10 (latest, with typescript-eslint v8).

**apps/web:** ESLint 9 (pinned locally — `eslint-config-next` 16.2.6 still
peers on v9 and its plugins crash with v10).

**Lint-staged narrowed to prettier-only:** the pre-commit hook can't easily
pick the right ESLint binary per file path without per-workspace shell
plumbing. CI runs `pnpm lint` (which calls each workspace's local script
and resolves the right ESLint binary) so nothing slips through.

**Revisit:** when `eslint-config-next` adds ESLint 10 peer support.

---

## 6. State management: Zustand + Dexie write-through

**Picked over:** React Query, single context reducer, server-driven RSC fetch.

**Why:** No server (no fetch round-trip to optimise). One small mutable
entity (UserCard, rarely >50 rows). Engine + ranking is <10ms for the full
catalogue. Loading every UserCard into a Zustand store on app start and
write-through to Dexie on mutations is the simplest path that satisfies
PRD §17's "Tab 4 updates within 1s of an add" requirement.

---

## 7. Catalogue schema follows the prototype exactly

Field names + literal unions confirmed by greping the deployed Replit
prototype's JS bundle (saved to `docs/.prototype-schema-notes.md`).
Engine ports verbatim — only the `@shared/schema` import line changed.

UserCard schema is the full PRD §16.2 fieldset (so M2/M3 don't need a
migration), but M1's manual-add form captures only:

- product (cardId), application date, optional cancellation date
- nickname, expiry MM/YY, last4 (all optional, all privacy-safe)
- bonus-received toggle, notes

The PRD §11.2.2 fields populated by camera + AI later (activationDate,
annualFeeNextDueDate, bonusTarget, etc.) are nullable columns now.

---

## 8. PAN / CVV enforcement

`apps/web/src/lib/safety.ts` runs at the store boundary:

- Free-text fields (`nickname`, `notes`) are scanned for 13–19-digit runs
  and rejected with a `PrivacyViolationError`.
- `last4` must match `/^\d{4}$/` or be empty/null.

OCR route handler is independently armoured:

- System prompt explicitly tells Claude not to return the full PAN.
- Response sanitiser replaces any 13–19-digit run with `[REDACTED]` in
  text fields.
- `last4` only accepted if exactly four digits.

Captured camera images are held in volatile memory for one Anthropic API
request only; never written to disk; never logged.

---

## 9. OCR vendor + model

**Picked:** Claude Sonnet 4.6 via `@ai-sdk/anthropic` (model id
`'claude-sonnet-4-6'` — the exact literal in the provider's TS union).

**Not picked:** AI Gateway / Vercel OIDC auth. User said "no Vercel yet".

**API key:** `ANTHROPIC_API_KEY` in `apps/web/.env.local`. When the key is
missing, `/api/ocr/card` returns 503 with a clear message and the rest of
the app keeps working. `.env.local` is gitignored.

**Anthropic non-retention:** standard API terms exclude inputs from
training. Surfaced verbatim in the scan UI footer.

---

## 10. Add-card form scope (union of kickoff + prototype)

**Kickoff allowed:** product, expiry MM/YY, application date, nickname,
optional last4.

**Prototype's modal added:** cancellation toggle/date, bonus-received,
notes.

**We shipped:** the union. The extra fields are privacy-safe (no PAN, no
CVV) and the cancellation date is essential — without it the engine can't
produce `waiting` results for real-world use.

---

## 11. Dev menu trigger

**Kickoff suggested:** long-press the app header.

**We shipped:** triple-tap (or Shift+? on keyboard).

**Why:** Long-press conflicts with iOS VoiceOver's exploration gesture and
Android TalkBack equivalents. Triple-tap is reliable for sighted users and
unambiguous for screen-reader users (it doesn't shadow assistive gestures).

---

## 12. Card art is procedural, not real

The 9 issuers render as Tailwind-gradient rectangles tinted by brand
colour (lib/theme.ts) with the issuer short-name + bonus-points overlaid —
same approach as the prototype. No real product images are shipped.
Drop-in replacement when we have rights-cleared art.

---

## 13. PH red placeholder hex

PRD §21.2 names "Point Hacks red" without a hex. We seeded
`#d62828` (close match to the prototype's red). Confirm the brand hex
and update `apps/web/src/app/globals.css` `@theme` and the
`themeColor` in `apps/web/src/app/layout.tsx`.

---

## 14. FAB long-press recent-action shortcut deferred

PRD §11.1 requires the FAB to long-press into the most recently used
action. With only one live action in M1, there's nothing to choose
between; deferred to M2 when there are ≥2 actions.

---

## 15. Per-card "Read guide" link — wired to upstream

**Resolved (post-M1, follow-up commit).** PRD §10.3 deep-links to the
canonical Point Hacks guide for each card on https://www.pointhacks.com.au/credit-cards/

- New `pointHacksUrl: string | null` field on `Card` in `@ph/shared/types`.
- 28 of 34 cards have a dedicated guide; 6 are null (Amex Business
  Explorer, Amex David Jones Platinum, Citi Rewards, CommBank Smart
  Awards, CommBank Awards, Virgin Money No Annual Fee — checked against
  the upstream `cardguide-sitemap.xml`, none have a current guide).
- "Read guide" button uses the URL when present; falls back to the
  index URL when null with label "Browse Point Hacks guides" so the
  affordance never disappears.
- Re-extraction recipe in the comment above `POINT_HACKS_URLS` in
  `packages/shared/scripts/generate-catalogue.ts` for when seed.ts
  changes.

**Open follow-ups** that the updated PRD §10.3 implies but aren't in
this commit:

- **Real card art** — upstream serves images at
  `plastic.pointhacks.com.au/api/files/...`. Currently we render
  procedural Tailwind-gradient art (see Decision §12). Fetching, caching,
  and serving real art is a small but distinct task — likely a
  build-time script that downloads each image and serves it via
  `next/image` (no client-side hot-link). Best done alongside a
  catalogue-refresh script.
- **Offer refresh** — bonusPoints / annualFee values are snapshotted
  from the early Feb 2026 seed. Upstream is now canonical, so we need
  a periodic refresh pipeline (manual cadence for M1 is fine; semi-
  automated parse of the index is the M5/M6 polish move). Without a
  refresh, our recommendations gradually go stale.

---

## 16. Validator-hook findings deliberately not addressed

The vercel-plugin's `posttooluse-validate` hook flagged three things on
the OCR route that we're not changing:

| Finding                                                  | Decision                                                                                                                            |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Model slug should be `claude-sonnet-4.6` (dots)          | Wrong — the provider's TS union literal is `'claude-sonnet-4-6'` (hyphens), greped + confirmed. Dots would fail typecheck.          |
| Replace direct API key with Vercel OIDC auth via Gateway | User explicitly chose direct + no Vercel.                                                                                           |
| Add Sentry/PostHog observability                         | Out of scope for M1 internal testing; PRD §20 marks full telemetry for M5. We added `console.error` on OCR failures as the minimum. |

---

## 17. ESLint config

- Root: ESLint 10 flat config with `typescript-eslint`'s recommended preset.
- apps/web: ESLint 9 with `eslint-config-next` (core-web-vitals + typescript).
- `docs/**` excluded from lint — those are source-of-truth reference files
  we don't own (the original engine + seed import from `@shared/schema`
  which we deliberately don't recreate).

---

## 18. Test runner: Vitest, only on the engine

27 specs cover every issuer eligibility type, every status, every scope
under `time_based`, the Amex personal-vs-business pool + 18-month
carve-out + lifetime exclusion fallback, and the `generateRecommendations`
ranking (priority bucketing, urgency bonus, sort order).

App-level (E2E / RTL) tests are deferred — the engine is the
business-logic core and the UI is thin. We can layer Playwright later.

---

## 19. Out of scope (called out for clarity)

Built deliberately as placeholders only:

- Tab 1 Card Matching
- Tab 2 Deals & Alerts
- Tab 3 Card Optimisation

Built as "Coming soon" rows in the FAB sheet:

- Update spend / benefit voice flow (M2)
- Ask Copilot (M3)

Not started at all:

- Card Alert Centre + local notifications (M4)
- Frequent flyer account linking (M5)
- PostHog / Amplitude / Mixpanel analytics wiring (M5)
- Vercel deployment + AI Gateway + OIDC auth (when we move past internal testing)
- Native React Native / Expo build (post-prototype validation)

---

## 20. Known issues / things to watch

- **First compile of any route on webpack:** ~2–5 seconds. Subsequent
  navigations are fast (~100ms).
- **The OCR endpoint's accuracy is unverified.** Code is written and
  typechecks, but it hasn't been run end-to-end against a real card yet
  (needs the user to supply `ANTHROPIC_API_KEY`). Expect to tune the
  prompt and the `matchCardFromOcr` heuristics after the first real run.
- **HMR with Dexie:** if you hot-reload the page and the schema changes,
  IndexedDB may need a manual `Clear all data` from the dev menu.
- **Pre-commit hook only runs Prettier**, not ESLint (see Decision #5).
  CI catches lint failures.
