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

Tab 3 (Card Optimisation) was a placeholder in M1 and is **now full per
PRD §9** (see §21 below). FAB Update spend / Update benefits / Ask
Copilot were "Coming soon" in M1 and are **now all live** (see §22–§24).

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

---

# M2 additions

## 21. Tab 3 Card Optimisation — built per PRD §9

Full build, not the placeholder from M1. Summary header (active cards,
min-spend remaining, points pending, action-needed count), collapsed
rows with status chip + one-line headline, expanded rows with editable
spend + projected completion + benefits + quick actions, and the 3-
month-to-bonus CTA banner at the top.

Status math + projections live in `lib/tab3-status.ts` as pure
functions — they're testable without React or a DB if/when we add
Vitest specs for them. PRD §9.5's "no spinners, no network, fully
offline" requirement is met because every value derives from the
in-memory Zustand stores.

## 22. Placeholder benefits dataset

`trackableBenefits[]` was an open item at the M2 kickoff (the original
prompt called it out). Since editorial benefit metadata isn't ready,
we ship a coarse tier-based placeholder in
`packages/shared/scripts/generate-catalogue.ts`:

- **Premium** (annualFee ≥ $350): Annual travel credit ($400) + Hotel
  credit ($200)
- **Mid-tier** (annualFee ≥ $100): Annual statement credit ($100)
- **Basic** (annualFee < $100): no benefits

44 benefits across the 34 cards. The schema is the right shape; swap
the templates for real per-card metadata in a one-line code change
and re-run `pnpm --filter @ph/shared generate-catalogue`.

## 23. Voice input — Web Speech API

`SpeechRecognition` (vendor-prefixed) wrapped in `lib/speech.ts` +
`<VoiceInput>`. en-AU locale. Renders a fallback hint on browsers
without support — that's just Firefox today; Chrome / Edge / Safari /
mobile Safari all work. SpeechSynthesis is wrapped too (Ask Copilot's
TTS output).

Whisper deferred — the user picked Web Speech API for speed-to-
prototype. If accuracy bites later, swap by adding an
`/api/transcribe` endpoint and toggling between the two in
`<VoiceInput>`; the public component API doesn't need to change.

## 24. Natural-language parsing — Claude over hand-rolled

PRD §11.3.2 requires numeric parsing for "plain ('250'), dollar
('$250'), spoken ('two fifty', 'four thirty', 'twelve hundred'), and
decimal ('1,234.56')" plus disambiguation across the user's held
cards by product fragments / issuer fragments / nicknames. Building
all that by hand would be a maintenance hole.

Instead, every voice flow routes the utterance through Claude with
a tight Zod schema:

- `/api/parse/spend` → `{ amount, cardId, confidence }`
- `/api/parse/benefit` → `{ userCardId, benefitId, confidence }`
- `/api/onboard/parse` → `date | yesno | spend_target` (one endpoint,
  three schemas)
- `/api/ask` → `{ answer, inScope }`

Pattern centralised in `lib/ai-client.ts` (`generateStructuredObject`)
so each route is small and the model id is one-line-swappable.

Cost stays bounded: each call is a single short prompt with structured
output (~100–500 tokens) on Claude Sonnet 4.6. Internal testing volume
won't break a hobby key.

## 25. Conversational post-OCR onboarding

After `/scan` extracts product/last4/expiry, the flow now lands on
`/onboard` (not `/add-card`). Four-question state machine:

1. When did you activate this card? → date parse
2. When is the annual fee next due? → date parse, skippable
3. Have you received the sign-up bonus? → yes/no parse
4. Min-spend target + deadline? → combined parse, skippable

Each question is voice-or-text via `<VoiceInput>` and speaks the
prompt aloud via SpeechSynthesis (if available + supported). State
machine is client-side, no per-step persistence — the final review
step is the only commit point. Manual `/add-card` form is still
available for users who skip OCR.

## 26. Ask Copilot grounding strategy

`lib/ask-context.ts` builds a tight markdown context block from the
user's local stores (held + cancelled cards, top 8 recommendations,
benefit statuses with current-period redemption state). Sent verbatim
with each question; Claude is instructed to answer ONLY from this
block, refuse out-of-scope politely, cite the data, and explicitly
NOT claim to mutate state (read-only per PRD §11.5.2).

No chat history persisted — each turn is fully ephemeral per
PRD §11.5.2. The user can speak or type the question; the answer
renders as text and optionally plays back via TTS (toggle in the
header).

## 27. Validator hook still flags the same 3 things on every Claude route

Every `/api/*/route.ts` that imports the AI SDK gets the same three
validator hook complaints from §16 above. They're noted there;
applies uniformly to `/api/ocr/card`, `/api/parse/spend`,
`/api/parse/benefit`, `/api/parse/quick-update`, `/api/ask`,
`/api/onboard/parse`. No code changes — same reasoning each time.

---

# M3 additions (FAB + voice everywhere)

## 28. Add Card flow unified — photo-first, conversational, voice-primary

The M1/M2 flow split Add Card into two FAB actions (Scan + Add manually)
plus a separate /onboard step. User feedback: "instead of selecting
[scan vs manual] we should allow them to take photo or load photo of
card. From there extract the details and verify with user but allow them
to type or speak to dictate confirmations. Ask user one question at a
time as well not everything on one modal. Voice is the primary flow."

**We shipped:** a single `/add-card` route that runs a progressive
chat-style flow:

1. **Photo step**: 3 buttons — "Take photo" (file input with
   `capture="environment"` — native camera on mobile, file picker on
   desktop), "Upload from file", "I'll pick it manually".
2. **Confirm card** (post-OCR): chat prompt asks "Is this the right
   card — {name}?" with Yes/No buttons + VoiceInput. Voice "yes" /
   "confirm" advances; voice "no" routes to manual picker.
3. **Pick card** (manual / fallback): VoiceInput backed by
   `/api/match/card` (Claude-free local fuzzy match — fast, no API key
   needed), plus a collapsible catalogue browse.
4. **Q&A steps** (activation date → fee due → bonus received → spend
   target + deadline): one question per screen, VoiceInput on each,
   each answer parsed by `/api/onboard/parse` (Claude — handles
   "three weeks ago", "yep", "$3000 in 90 days"). SpeechSynthesis
   reads each prompt aloud as it appears.
5. **Review + Save**.

The chat thread builds up as you go — previous Q+A render as chat
bubbles above the current question. Back button walks one step at a
time without losing earlier answers.

Routes deleted: `/scan`, `/onboard`. FAB sheet shrinks from 5 → 4
actions: **Add a card** (unified), Update spend, Update benefits,
Ask Copilot. Old `apps/web/src/components/{scan,onboard,add-card}/`
all removed.

## 29. Tab 3 Quick Update voice bar

User feedback: "when they click FAB nothing happens on Tab 3 and it
should allow voice to text to update certain things".

The FAB sheet stays consistent across all tabs (so the user always
knows what's in it), but Tab 3 now has its own **inline voice
affordance**: a "Quick update" VoiceInput at the top of the dashboard,
above the held-card list. Speak either a spend OR a benefit phrase;
`/api/parse/quick-update` decides which one the user meant and applies
it inline. 30-second Undo toast like the FAB Update Spend flow.

The parser endpoint returns a discriminated union — `kind: 'spend' |
'benefit' | 'unknown'` — so the client knows which mutation to run
without asking the user a follow-up category question.

## 30. Voice confirmation on destructive Cancel

"Cancel card" is the only destructive mutation. Tap **Cancel card**
(in Tab 3 expanded row or Tab 4 detail page) now opens an inline
confirm block with:

- "Yes, cancel it" button (tap)
- "Keep it" button (tap)
- VoiceInput — "yes" / "confirm" / "cancel it" triggers; "no" /
  "stop" closes.

Non-destructive actions (Mark as applied, marking individual benefits
used, updating spend) stay single-tap — adding a voice confirm step
to them would slow down the high-frequency flows.

**Not extended to voice-as-trigger globally:** the user's "voice-
confirmable anywhere" answer covered destructive actions; turning
Ask Copilot into a mutating voice command surface would contradict
PRD §11.5.2 (read-only by design). Voice-as-trigger for non-
destructive actions is already covered by the FAB voice flows
(Update spend / Update benefits) and the Tab 3 Quick Update bar.

---

## 31. Balances auto-sync via email forwarding, not Gmail API (for v1)

**Considered:** Direct Gmail API (`gmail.readonly` scope, OAuth "Connect
Gmail" button, `watch()` push notifications when balance emails arrive).
Bypasses forwarding setup entirely; user experience is one-click.

**We chose:** Per-user forwarding address (`slug@pointhacks.app`) + Postmark
inbound webhook + server-side auto-verify of Google's confirmation email.
Users set a Gmail filter once per program that forwards balance emails to
their unique address; our webhook parses and updates balances.

**Why:** Gmail API is technically simpler but comes with real drag:

- `gmail.readonly` is a restricted scope; CASA Tier 2 audit required
  before serving >100 production users (now ~$540 via Google's 2024
  authorized-assessor programme like TAC Security, down from the older
  $15-75k rates — but the 3-6 month audit + verification timeline is
  the actual blocker, not the cost)
- "Unverified app" warning on the OAuth consent screen bounces ~40% of
  new signups during the verification period
- Limited Use policy compliance requires encryption-at-rest (currently
  waived per Decision #2), no human-reads-the-email support path, no
  training on email content
- 100-user cap in test mode while the audit runs

Forwarding path ships in weeks, works for every mail provider, no
compliance drag. Server-side auto-verification of Google's forwarding
confirmation email keeps the user's setup steps to "paste the address
into Gmail settings", so friction is smaller than it looks.

**What this costs:** Users must create one Gmail filter per program
they want auto-synced (Qantas, Velocity, Amex MR). One-time step per
program, ~30 seconds each with a pre-filled deep-link. The 12-month
buffer of user data quality difference vs Gmail API is real; some
users will prefer to enter balances manually forever.

**Migration path:** Post-launch, add "Fast connect (Gmail)" as an
alternative flow alongside forwarding. Existing users stay put; new
users get the choice. Microsoft Graph for Outlook slots in as a third
adapter (much lower verification bar than Gmail). IMAP with an
app-specific password covers iCloud / Yahoo / ProtonMail power users
as a fourth adapter. Sketch: `docs/AFFILIATE_TRACKING.md` (companion
doc pattern; email-ingest sketch to follow when we build it).

**Scope expansion (2026-08-20):** Both mechanisms will ship in v1 —
forwarding for anyone, OAuth for the taps-and-done crowd. Build order
locked as:

1. **Forwarding backend v1** (Postmark inbound, per-device slugs, parser
   framework, first two parsers Qantas + Velocity, auto-verify handler).
2. **Outlook OAuth trial** (Microsoft Graph `Mail.Read` +
   `offline_access`). Chosen ahead of Gmail because Microsoft's basic
   mail-read scope is not restricted — no security audit, no verification
   backlog, publishes in days. Smaller AU coverage than Gmail but this
   is a mechanism test; the parser layer is identical, so the second
   provider is an ingress swap.
3. **Gmail OAuth** once Outlook validates the shared parser pipeline
   end-to-end. Kick off CASA Tier 2 in parallel; forwarding remains the
   universal fallback during audit.

Program parsers land in ingress-order Qantas → Velocity; Amex MR,
KrisFlyer, and the rest wait until those two are proven correct on
real inbound emails (parsers are cheap to add once the framework and
the first two are cleaned up).

---

## 32. Affiliate attribution via subid, keyed on device_id

**Considered:** (a) Cookie-only attribution (fragile — Safari ITP, incognito,
cleared cookies), (b) Coupon codes (requires each bank to support codes),
(c) Manual reconciliation (screenshot uploads, human review), (d) subid
tracking via existing affiliate networks.

**We chose:** Every outbound "Apply now" link is decorated with the user's
`device_id` as the network's subid parameter (`?sub1=<deviceId>` for
Commission Factory, `?subId1=` for Impact, etc.). Networks return the
subid in either real-time postbacks (`POST /api/affiliate/postback/[network]`)
or batched CSV reports; we join on it to attribute conversions back to
the specific device. Approved conversions auto-grant benefits via a
`device_grants` table.

**Why:** subid is universally supported by AU affiliate networks
(Commission Factory, Impact, Awin, Rakuten, direct bank feeds all
accept a custom string in the outbound URL). Reuses the existing
`device_id` scheme with zero new auth model. Server-side attribution
is bulletproof — no cookie loss, no ITP issues, no user action
required. The `on_approved_reward` JSONB column on `affiliate_offers`
means new reward types ship without migrations.

**What this costs:** Device-scoped means a user losing storage or
switching devices loses their attribution history and any granted
benefits. Acceptable v1 trade-off; migration path adds `user_id`
column to all three affiliate tables when we build real auth.

**Compliance:** ASIC RG 209 requires disclosing that we receive a
commission; every Apply CTA and the T&Cs need clear "We may receive
a commission if you're approved" wording. Not optional — this is
regulated territory. Standard AU affiliate content follows the same
pattern.

**Sketch:** `docs/AFFILIATE_TRACKING.md` — full schema (4 new Drizzle
tables), both API routes, per-network adapter pattern, testing
approach with fixture replay.

---

## 33. Lacquer brand + IA + Perry refresh

**Considered:** iterating on the current brand — keep placeholder red
as brand + action, tidy the hamburger nav, patch Perry's overlay
behaviour — as a smaller, quicker pass. Rejected because the design
handoff identifies structural problems that iteration can't reach:
red carrying brand, action, active state, positive figures and
warnings simultaneously (the colour system had collapsed to "red
means something"); recommendations shipping without evidence; action
lists claiming empty while deadlines sit two rows above them; Perry
covering live content on every screen.

**We chose:** full "Lacquer" refresh — spec in
`docs/design/lacquer/HANDOFF.md`, plan in `docs/LACQUER_REFRESH.md`.

- **Palette**: lacquer brick `#8E2A22` becomes the brand surface; the
  placeholder `--color-ph-red` (`#D62828`) is retained as primary
  action only. Pine (`#1F4B3F`) for on-track / positive, amber
  (`oklch(0.85 0.12 80)`) for deadlines / reached. Red never means
  "at risk" again.
- **Type**: Instrument Serif 400 for display type (screen title,
  hero figure, card title, stat figure); Geist retained for row
  titles and body; Geist Mono for eyebrow labels and inline meta.
  Never bold the serif.
- **IA**: Next Card folds into Optimise as a sub-tab; Journeys and
  Point balances promote to a fourth tab (Destinations + Balances
  sub-tabs); Today moves to a top-right icon; hamburger shrinks to
  Settings only. The Today/Journeys toggle inside Home disappears.
- **Perry**: four moments only — Resting (bar avatar), Deadline
  slipping, Bonus cleared, Destination unlocked, First-run. Never a
  floating overlay covering live content.
- **Scope**: Today, Optimise (Your cards + Next card), Journeys
  (Destinations + Balances), Alert Centre, `+` action sheet,
  Log-a-spend, Add-a-card, Perry. Matching + Deals stay as-is —
  refreshed later.

**Why:**

- The colour contract is the single biggest change and everything else
  compounds on it. Once brick is the brand surface and red is action
  only, chip taxonomy becomes legible, warnings stop competing with
  brand identity, and the Perry-as-brand-avatar decision is coherent.
- Instrument Serif carries "premium AU points-hacking" without
  needing weight. The current Geist-only stack reads as generic SaaS.
- Journeys as a top-level tab (rather than hamburger-nested inside
  Home) matches how users think about the app: cards → optimise →
  destinations. Home-as-Today survives, just off a top-right icon.
- The Perry constraint ("four moments, silent otherwise") turns a
  liability into an asset. A mascot that speaks four times a month
  is a character; one that greets every screen is a cursor.

**What this costs:**

- Every screen in scope gets a rebuild against the new tokens and IA.
  Multi-phase — foundation → primitives → nav shell → screen
  redesigns → sheets + Perry → assets + polish. Sequenced so each
  phase is preview-deployable and prod cutover only happens at
  milestones.
- Instrument Serif adds a Google Fonts request; served weight 400
  only to keep it under 30KB.
- Matching + Deals will look "old" against Lacquer screens during
  the transition. Acknowledged and accepted; those two are
  scope-out for this refresh and get their own pass later.
- Real card art, program logos, destination photos, and Perry
  artwork must be sourced before Phase 6 goes prod. Phases 1–5
  build behind placeholders (cream frame + labelled strip).
- Dark mode not designed yet — spec calls for `#2E0A08` base, brick
  as card surface, red as action. Full dark pass lands in Phase 6.

**Safety net:**

- `stable/pre-lacquer` branch pinned at `69a9985`, pushed to origin.
- `snapshot/pre-lacquer-2026-08-20` annotated tag on the same
  commit, pushed to origin. Immutable pin.
- Vercel prod alias `ph-copilot-gamma.vercel.app` stays on
  `dpl_5CeQ9CdaazYzEFbwAoT7hkyGCtXB` (pre-Lacquer) until we
  deliberately flip. Rollback is one `vercel alias set` write and
  iOS TestFlight build 27 picks it up instantly.
- All Lacquer work on `feat/lacquer-refresh`. Do not commit to
  `feat/home-journeys-settings` while Lacquer is in flight — it
  remains the "known-good" prod source of truth.

**Migration path:** phases 1 and 2 land zero user-visible change; the
first cutover is Phase 3 (nav shell). Every prod flip is instantly
reversible via the Vercel alias. iOS never rebuilds during any of
this — the WKWebView shell keeps loading whatever prod is aliased to.
Codemagic only re-enters the loop in Phase 6 when native asset
changes (icon / splash) are ready alongside real Perry artwork.

**Reference:** `docs/design/lacquer/HANDOFF.md` (full spec verbatim
from the designer bundle), `docs/LACQUER_REFRESH.md` (phase plan),
`docs/design/lacquer/github.md` (screen-to-source map from the
designer's sync).
