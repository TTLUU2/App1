# Point Hacks Copilot

AU credit-card eligibility & optimisation. M0 + M1 + M2 milestones are a
Next.js 16 web prototype for internal testing — native mobile (per PRD
§22.1) is deferred. The shared eligibility engine ships as a workspace
package so the future native build reuses it unchanged.

> **Why web first?** See `docs/DECISIONS.md`. Short version: we pivoted from
> React Native / Expo to a web app to de-risk the card-OCR flow without
> paying the native-build tax up front.

---

## Quick start

```bash
# 1. Install
pnpm install

# 2. (Optional, for the card-scan flow) Add an Anthropic API key.
#    Everything except /api/ocr/card runs without one.
cp apps/web/.env.example apps/web/.env.local
# then edit .env.local and paste your key

# 3. Run
pnpm dev              # http://localhost:3000

# 4. (Optional) Seed demo data so Tab 4 shows every status without
#    manually adding cards: triple-tap the "Next Card" header → "Seed demo data"
```

The dev server runs on **webpack** (not Turbopack — Turbopack pegged the dev
machine with 30+ worker processes; see Decisions doc). First compile of any
route takes ~2–5s; subsequent navigations are fast.

---

## What's in here

```
.
├── apps/
│   └── web/                Next.js 16 App Router (React 19, Tailwind v4)
│       ├── src/app/                    routes: / (Tab 4), /matching, /deals,
│       │                               /optimisation, /add-card, /scan, /onboard,
│       │                               /spend, /benefits, /ask, /cards/[id],
│       │                               /api/ocr/card, /api/parse/{spend,benefit},
│       │                               /api/ask, /api/onboard/parse
│       ├── src/components/             tab-bar, fab-sheet, dev-menu, voice-input,
│       │                               next-card/*, tab3/*, scan/*, add-card/*,
│       │                               spend/*, benefits/*, ask/*, onboard/*
│       ├── src/lib/                    db (Dexie v2), safety, theme, format, time,
│       │                               speech, ai-client, ask-context, tab3-status,
│       │                               dev-fixtures, match-card
│       └── src/store/                  Zustand stores (user-cards + user-benefits)
├── packages/
│   └── shared/             @ph/shared — engine port + types + bundled
│                           catalogue. Pure TS, zero UI deps. 27 Vitest specs.
├── docs/                   PRD (.docx + extracted .md), Decisions doc,
│                           prototype reference, screenshots, kickoff prompt
├── .github/workflows/      CI: typecheck + lint + test on push/PR
└── (root tooling)          pnpm workspace, ESLint, Prettier, husky,
                            lint-staged, shared TS base
```

---

## Architecture in one paragraph

The eligibility engine is the source of truth and lives in `packages/shared`
(pure TS, Node-runnable, no React deps — straight port of the prototype's
`eligibility-engine.ts` with only the `@shared/schema` import rewired to a
local types module). The web app loads the bundled JSON catalogue (9
issuers, 34 cards, deterministic UUIDs via uuid v5) on import. User card
history persists in IndexedDB via Dexie; a Zustand store mirrors it in
memory so Tab 4 recompute is synchronous (engine + ranking for 34 cards
runs in <10ms, well under PRD §19.1's 300ms budget). The PAN/CVV
write-boundary validator (`src/lib/safety.ts`) rejects any 13–19-digit
string in free-text fields before it touches the DB. The OCR endpoint
(`/api/ocr/card`) uses the AI SDK 6 with `@ai-sdk/anthropic` and the
`Output.object` pattern (the old `generateObject` is gone in AI SDK 6).

---

## Commands

| Command                                       | What it does                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`                                    | Start `apps/web` on http://localhost:3000 (webpack)                              |
| `pnpm build`                                  | Production build of every workspace                                              |
| `pnpm test`                                   | Vitest across every workspace (27 engine specs in `@ph/shared`)                  |
| `pnpm typecheck`                              | `tsc --noEmit` across every workspace                                            |
| `pnpm lint`                                   | ESLint across every workspace                                                    |
| `pnpm format`                                 | Prettier-format the tree                                                         |
| `pnpm --filter @ph/shared generate-catalogue` | Regenerate bundled JSON from seed inputs (idempotent — uuid v5 keeps ids stable) |

CI runs `typecheck + lint + test` on every push to `main` and every PR.

---

## Reference materials

- `docs/PointHacksCopilot_PRD_v1.0.docx` — PRD v1.0 (source of truth)
- `docs/.prd-extracted.md` — pandoc/textutil-extracted markdown (gitignored, regenerate locally if you need it)
- `docs/Claude_Code_Kickoff_Prompt.md` — engineering kickoff prompt
- `docs/Bonus Eligibility Reference/` — pre-pivot Replit prototype source + 8 reference screenshots
- `docs/Notifications Reference/` — alert-centre presentation deck + screenshots (for the M4 milestone)
- `docs/DECISIONS.md` — every non-trivial choice + every deviation from the kickoff, with rationale

---

## What's working (M1 + M2)

- ✅ 4-tab shell with persistent bottom bar: Card Matching, Deals & Alerts, **Card Optimisation (full)**, Next Card (full)
- ✅ Central FAB sheet, **all five actions live**: Scan card, Add card to history, Update spend, Update benefits, Ask Copilot
- ✅ **Tab 4 (Next Card)**: hero card, eligible-cards summary by FF program, upcoming list, collapsible grey-area + not-eligible sections, sort + filter
- ✅ Per-card detail screen: status, confidence, reason, issuer rules, your history, mark-as-applied / mark-as-cancelled, "Read Point Hacks guide" deep-link (28/34 cards have direct URLs)
- ✅ **Tab 3 (Card Optimisation)** per PRD §9: summary header (active / min-spend remaining / points pending / action-needed), per-card collapsed + expanded rows with editable spend + projected completion + benefit redemption + quick actions, 3-month-to-bonus CTA banner
- ✅ Manual add-card form with all PRD §16.2 fields (activation, fee due, bonus tracking) and the PAN/CVV write-boundary validator
- ✅ Camera capture + Claude Vision OCR → conversational onboarding (4-question voice/text Q&A) — needs `ANTHROPIC_API_KEY`
- ✅ FAB **Update spend**: voice or text, Claude-driven parse, disambiguation, 30-second Undo (PRD §11.3)
- ✅ FAB **Update benefits**: voice or text, maps phrase to specific benefit on specific held card (PRD §11.4)
- ✅ FAB **Ask Copilot**: voice in / voice out, Claude-grounded read-only Q&A over local data + catalogue (PRD §11.5)
- ✅ IndexedDB persistence (v2 schema: userCards + userBenefitRedemptions); cross-tab recompute under 1s
- ✅ Dev menu seeder (triple-tap any page header) — 5 demo cards covering every status

## What's deferred

- Tabs 1, 2 (placeholders — PRD §7, §8)
- Card Alert Centre + local notifications (PRD §15 / M4)
- Frequent flyer account linking (PRD §14 / M5)
- PostHog / Amplitude / Mixpanel analytics wiring (PRD §20 / M5)
- Encryption-at-rest on the DB (waived for internal testing — see Decisions §2)
- Vercel deployment (deferred per user request — local dev only)
- Native React Native / Expo build (post-prototype validation)
