# Lacquer refresh — build plan

Living plan for the "Lacquer" brand + IA + Perry refresh. Companion
to [`docs/design/lacquer/HANDOFF.md`](design/lacquer/HANDOFF.md) (the
full spec) and [DECISIONS.md #33](DECISIONS.md) (the trade-off).

## What we're building

Not a repaint — three shifts in one refresh:

1. **Brand**: placeholder `--color-ph-red` (`#d62828`, always a
   bookmark) becomes a full palette anchored on lacquer brick
   `#8E2A22`; red demoted to primary-action only.
2. **IA**: Next Card folds into Optimise as a sub-tab; Journeys +
   Balances promote to a fourth tab; Today moves to a top-right icon;
   hamburger shrinks to Settings only.
3. **Content behaviour**: recommendations show reasoning; action lists
   match the deadline counts (no "nothing urgent" while two deadlines
   sit above); cards show pace not fees/dates; Perry becomes a
   four-moment character, no longer a floating overlay.

**Scope in**: Today, Optimise (Your cards + Next card), Journeys
(Destinations + Balances), Alert Centre, `+` action sheet, Log-a-spend,
Add-a-card, Perry states.

**Scope out**: Matching, Deals — stay as-is; refresh them later once
the design system is proven.

## Safety net (already in place)

- **Branch**: `stable/pre-lacquer` pinned at commit `69a9985`.
- **Tag**: `snapshot/pre-lacquer-2026-08-20` on the same commit.
- **Vercel prod alias** `ph-copilot-gamma.vercel.app` still points at
  the pre-Lacquer deployment (`dpl_5CeQ9CdaazYzEFbwAoT7hkyGCtXB`).
  iOS TestFlight build 27 loads from that alias — no user sees Lacquer
  until we deliberately flip prod. Rollback is one Vercel alias write.
- **Main** stays 76 commits behind; a natural clean slate if the whole
  branch ever needs abandoning.
- **All Lacquer work lives on `feat/lacquer-refresh`.** Do not commit
  to `feat/home-journeys-settings` while Lacquer is in flight.

## Phase plan

Each phase is independently deployable to a Vercel preview URL for
review before merging. Prod cutover happens only when a milestone is
signed off. Sequence bounded by the "one signature surface" rule: we
can't ship Home in Lacquer while Optimise is still in placeholder red,
or vice versa — the app would visibly split. So the phases end at
natural cutover points.

### Phase 1 — Tokens, typography, primitives (foundation, invisible)

Zero user-visible change: existing screens compile against new tokens
and render exactly as before, because we don't touch component
classes yet. Sets up everything downstream.

- Add every `--color-ph-*` token from HANDOFF.md to `globals.css` and
  `lib/theme.ts`; keep the existing `--color-ph-red` mapped to
  `#D62828` (unchanged) and add `--color-ph-brick`, `--color-ph-ink`,
  `--color-ph-paper`, `--color-ph-pine`, `--color-ph-amber`, and the
  chip/border variants.
- Load Instrument Serif via `next/font/google` (weight 400 only,
  optional italic). Wire a `--font-serif` CSS variable and a Tailwind
  `font-serif` mapping.
- Add spacing/radius/shadow tokens for the FAB shadow, hero-card
  radius (22), segmented-control thumb shadow.
- Ship the tab-bar recolour separately in Phase 2 — not here.

**Exit criteria**: `pnpm typecheck`, `pnpm lint`, `pnpm build` green.
Every existing screen visually unchanged. Preview URL diffs match
before/after.

### Phase 2 — Component primitives

Rework the shared UI so per-screen work in later phases is a
composition job, not a rebuild.

- `SegmentedControl` — the `999px` pill pattern used by both Optimise
  and Journeys sub-tabs.
- `HeroCard` — brick, `radius:22`, padding 20, the "one signature
  surface" wrapper.
- `EvidencePanel` — paper-tinted inset (radius 14), dot bullets, used
  by Next card and Log-a-spend.
- `StatusChip` — extend the existing `status-chip.tsx` so the same
  contract covers pine/amber/red/negative variants without breaking
  the colour+icon+label rule.
- `BottomSheet` — the standardised paper sheet with the brick grab
  handle, used by Log-a-spend and Add-a-card.
- `CardArtFrame` — cream surround + hairline, in the 5 sizes the spec
  lists (96×61, 92×58, 58×37, 48×31, 44×28). Wraps the actual card
  image; art itself is placeholder for now.
- `PerryAvatar` — 26px + 46px variants; brick disc + serif `P` for
  now, swaps to real artwork once art lands.

**Exit criteria**: components ship with a `/dev/lacquer-primitives`
preview page (dev-only, gated behind `NODE_ENV !== 'production'`) so we
can review them isolated before deploying to real screens.

### Phase 3 — Navigation shell (visible cutover)

The first user-visible change. All existing screens still render, but
the frame around them shifts.

- Tab bar recoloured (`Matching · Deals · [+] · Optimise · Journeys`).
  FAB brick with the one shadow the system permits.
- Header rework: title left in Instrument Serif, `⌂ / bell / ☰`
  cluster right. Move mute + dark toggles into Settings.
- Route wiring:
  - `/` → Today
  - `/optimise` → Optimise (`?tab=cards` default, `?tab=next` sub-tab)
  - `/journeys` → Journeys (`?tab=destinations` default, `?tab=balances`)
  - `/alerts`, `/settings`, `/today` (moved off `/home`)
- Delete the Today/Journeys segmented toggle from Home.
- Redirect the old `/home` and `/balances` routes to their new homes.

**Exit criteria**: every route lands somewhere sensible. Deep links
from build 27 (`/home?view=journeys`, `/balances`) redirect cleanly.
Preview URL passes a full click-through of the tab bar.

### Phase 4 — Screen redesigns (Today, Optimise, Journeys, Alerts)

One PR per screen, each preview-deployable. Sequence:

1. **Today** — score card + stat row + Do today + Copilot bar.
2. **Optimise · Your cards** — min-spend pace card as the anchor.
3. **Optimise · Next card** — best-move card + evidence panel + full
   ranked list including ineligible.
4. **Journeys · Destinations** — brick hero + destination grid +
   "Almost there" row set.
5. **Journeys · Balances** — brick hero + program rows + collapsed
   auto-sync row.
6. **Alert Centre** — `NEEDS YOU` / `GOOD NEWS` grouping, action
   buttons on deadlines only.

Matching and Deals stay as-is; they don't get new tokens applied yet
(explicit scope-out). They will look "old" against the Lacquer
screens; that's expected and flagged in the plan.

**Exit criteria per screen**: matches the HANDOFF spec at 90%+ visual
fidelity when eyeballed at real device size on preview URL. Copy is
final. Behaviour rules 1–8 respected on that screen. Placeholder card
art / logos / destination photos acceptable — see "Assets" below.

### Phase 5 — Actions, sheets, Perry

- `+` action sheet — the labelled list replacing the fan.
- Log-a-spend sheet with live consequence panel.
- Add-a-card sheet.
- Perry states — Resting, Deadline slipping, Bonus cleared,
  Destination unlocked, First-run. Persisted "which moments have
  fired" state (once per deadline, never repeated).

**Exit criteria**: full user flow — open `+`, log a spend, see the
consequence, watch a deadline chip refresh — works end-to-end without
throwing. Perry only appears in the four defined moments.

### Phase 6 — Assets + polish

- Real card art, program logos, destination photos, Perry artwork
  (26px + 46px variants). Sourced separately; drops into existing
  frames without code change.
- Dark mode: ink `#2E0A08` base, brick lifts, red stays, amber + pine
  hold at design lightnesses. Full pass across every screen.
- Motion refinements (segmented thumb slide, sheet slide-up curve,
  progress-bar animate-from-previous, `Mark used` optimistic pine
  swap).
- Micro-copy and empty states.

**Exit criteria**: production alias `ph-copilot-gamma.vercel.app`
flipped to a Lacquer deployment. iOS build (Codemagic) with any
updated capacitor assets. Marketing site (out of scope of this plan
but likely follows).

## Assets to source (from HANDOFF.md § "Assets needed")

Blocked on real art before Phase 6 goes prod:

- **Card art** per product — cream frame, no gradient, 5 sizes.
- **Program logos** — Qantas, Velocity, Amex MR, KrisFlyer at 34px.
- **Destination photos** — Tokyo, Osaka, Seoul, Paris, London.
- **Perry** — 26px and 46px marks. Plane silhouette preferred; the
  disc is a placeholder.
- **Instrument Serif** — Google Fonts, weight 400 only.

Phases 1–5 build behind placeholders (the cream frame + labelled
strip pattern from the mock). Nothing blocks Phase 1 or Phase 2.

## Open risks called out in the spec

1. **Brick beside real issuer red card art.** Westpac, NAB, Virgin
   sit in the red family. Must eyeball with real card images before
   committing to Phase 4 · Optimise · Your cards.
2. **Today's discoverability.** Top-right unlabelled icon may be
   missed. Product decision pending — treat the icon as reversible.
3. **Program-logo assets don't exist yet.** Every mock ships with
   labelled placeholders. Balances screen will look "wrong" until
   Phase 6 assets land.

## Handoff bundle

Original bundle from designer: `~/Downloads/design_handoff_lacquer_refresh/`.
Rehydrated in-repo at `docs/design/lacquer/` — see HANDOFF.md,
github.md. The 280KB `Brand & UI Direction.dc.html` visual reference
and its runtime shim (`ios-frame.jsx` + `support.js`) are not currently
in-repo; add them if they resurface.
