# Handoff: Point Hacks Copilot — Lacquer design refresh

## Overview

A full visual and IA refresh of the Point Hacks Copilot app (`TTLUU2/App1`, `apps/web`). Three things change:

1. **Brand** — the placeholder `--color-ph-red: #d62828` is replaced by a real palette built around a deep lacquer brick, with red retained as the primary action colour. Instrument Serif joins Geist for display type.
2. **Information architecture** — Next Card becomes a sub-tab of Optimise; Journeys is promoted out of the hamburger to the fourth tab with Point balances as its second sub-tab; Today moves to a top-right icon.
3. **Content behaviour** — recommendations show their reasoning, action lists never claim to be empty while deadlines exist, card records show pace rather than reference data, and Perry becomes a four-moment character rather than a floating overlay.

Scope of this handoff: **Today, Optimise (Your cards + Next card), Journeys (Destinations + Balances), Alert Centre, the + action sheet, Log-a-spend, Add-a-card, and Perry's states.** Matching and Deals are explicitly out of scope — they remain placeholders to be redesigned later.

## About the design files

`Brand & UI Direction.dc.html` in this bundle is a **design reference created in HTML** — a prototype showing intended look and behaviour, not production code to copy. The task is to **recreate these designs in the existing Next.js + Tailwind codebase** using its established patterns (`lib/theme.ts` tokens, `components/status-chip.tsx`, `components/tab-bar.tsx`, the existing sheet and card primitives).

Do not port the inline styles. Add the tokens below to `globals.css` / `theme.ts` and build with the codebase's own component vocabulary.

The file contains six turns of exploration stacked newest-first. **Only these sections are approved:**

| Section    | What it holds                                                              |
| ---------- | -------------------------------------------------------------------------- |
| `6a` (top) | + action sheet, Log a spend, Add a card, Alert Centre, Perry's four states |
| `5a`       | IA before/after map, Optimise ×2, Journeys ×2, Today                       |
| `4a`       | Component set, plus Journeys / Next Card / Optimise in the chosen brand    |
| `3b`       | The chosen brand direction ("Lacquer") and its rationale                   |

Sections `1a`, `2a`, `2b`, `2c` and `3a` are **rejected explorations** kept for the record. Ignore them — `1a` in particular uses an aubergine palette that is not the direction. The eight UX recommendations written up in `1a` do still apply and are summarised under "Behaviour rules" below.

## Fidelity

**High-fidelity.** Colours, type sizes, spacing, radii and copy are final and should be recreated closely. Two deliberate exceptions:

- **All card art and program logos are placeholders** (diagonal-striped cream blocks labelled `card art` / `logo`). No logo assets exist in the repo — `apps/web/public/` contains only `icon.svg`. Real Point Hacks product images must be sourced and dropped into the cream frame described under Components.
- **Perry is a placeholder** — a brick disc with a serif `P`. Real artwork pending; he needs a version legible at 26px and one that fills a 46px circle.

Destination photography (Tokyo, Osaka, Paris, London) is also placeholder striping.

---

## Design tokens

Replace the placeholder red. Suggested CSS custom property names follow the existing `--color-ph-*` convention.

### Colour

| Token                      | Hex / value                   | Role                                                                        |
| -------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `--color-ph-ink`           | `#2E0A08`                     | Darkest brand ink. Headings, active nav, sheet titles, dark surfaces        |
| `--color-ph-brick`         | `#8E2A22`                     | **Brand surface.** Hero cards, tab-bar FAB, active tab, Perry avatar, links |
| `--color-ph-red`           | `#D62828`                     | **Primary action only.** Buttons, notification dot, active-state fills      |
| `--color-ph-paper`         | `#F6F1E9`                     | App background                                                              |
| `--color-ph-card`          | `#FFFDF9`                     | Card / raised surface                                                       |
| `--color-ph-border`        | `#E4D8D3`                     | Default hairline on cards                                                   |
| `--color-ph-border-strong` | `#DFD0CB`                     | Input and Copilot-bar border                                                |
| `--color-ph-fill`          | `#EDE2DE`                     | Progress track, segmented-control track                                     |
| `--color-ph-fill-warm`     | `#F2E7E4`                     | Secondary button, icon tile                                                 |
| `--color-ph-tint`          | `#F7EDEA`                     | Informational panel background                                              |
| `--color-ph-tint-border`   | `#E8D4D0`                     | Border on tint panels                                                       |
| `--color-ph-text`          | `#3F332F`                     | Body text on cards                                                          |
| `--color-ph-text-muted`    | `#5F5450`                     | Secondary body text                                                         |
| `--color-ph-text-meta`     | `#6B5A56`                     | Mono labels, inactive tab labels (4.5:1 on paper)                           |
| `--color-ph-text-disabled` | `#4A403C`                     | Ineligible / disabled row titles                                            |
| `--color-ph-pine`          | `#1F4B3F`                     | **On track / positive.** Evidence bullets, "+$1,410", "✓ Used"              |
| `--color-ph-pine-text`     | `#17402F`                     | Positive text on tinted chip                                                |
| `--color-ph-pine-chip`     | `oklch(0.72 0.10 160 / 0.18)` | Positive chip background                                                    |
| `--color-ph-amber`         | `oklch(0.85 0.12 80)`         | **Reached / bookable.** Full progress fill, celebration figure              |
| `--color-ph-amber-chip`    | `oklch(0.79 0.13 75 / 0.24)`  | Deadline chip background                                                    |
| `--color-ph-amber-text`    | `#7A4E00`                     | Deadline chip text                                                          |
| `--color-ph-amber-figure`  | `#8A5A00`                     | Deadline count in stat rows                                                 |
| `--color-ph-negative-chip` | `#F7DDDA`                     | "Not eligible" chip background                                              |

On brick surfaces: `#F6F1E9` for primary text, `#FBEDEB` for list rows, `#EFCFCB` for secondary, `#E8B7B1` for mono eyebrow labels, `rgba(246,241,233,0.16)` for inset chips.

**The colour contract — enforce this or the system collapses:**

- Brick is the brand surface. Bright red is _only_ a primary action. Never a surface, never a status.
- Amber marks deadlines and "reached". Pine marks on-track and positive value.
- Red never means "at risk". This is the single most important change from the current app, where red carries brand, action, active tab, positive number and warning simultaneously.

### Typography

| Role               | Family               | Size / weight        | Tracking           |
| ------------------ | -------------------- | -------------------- | ------------------ |
| Screen title       | Instrument Serif 400 | 28–30px / 1.1        | —                  |
| Hero figure        | Instrument Serif 400 | 38–52px / 0.95–1     | `-0.02em` at 48px+ |
| Card title         | Instrument Serif 400 | 19–21px / 1.1        | —                  |
| Stat figure        | Instrument Serif 400 | 26–27px / 1          | —                  |
| Row title          | Geist 600            | 14.5–15.5px          | —                  |
| Body               | Geist 400            | 13–13.5px / 1.45–1.5 | —                  |
| Secondary          | Geist 400            | 12–12.5px            | —                  |
| Eyebrow / meta     | Geist Mono 400       | 9.5–10px uppercase   | `0.14–0.16em`      |
| Sync / inline meta | Geist Mono 400       | 10–11px              | `0.06–0.08em`      |

Geist is already in the codebase. **Instrument Serif is new** — add it (Google Fonts, weight 400 only, italic available). Never bold it; the serif carries the premium tone through size, not weight.

### Spacing, radius, shadow

- Screen padding: `24px` horizontal. Card gap: `12–14px`. Card padding: `15–18px`.
- Radius: hero card `22px`, standard card `18px`, inner panel `14px`, bottom sheet `26px 26px 0 0`, pill/button `999px`, icon tile `9–11px`, card-art thumb `5–9px`.
- Only one shadow in the system: the FAB, `0 8px 20px rgba(142,42,34,0.3)`. Segmented-control active thumb gets `0 1px 3px rgba(46,10,8,0.08)`. Cards use hairline borders, not shadows.
- Progress bars: `5px` inline, `7–8px` standard, `10px` hero. Track `--color-ph-fill`.

---

## Information architecture

### Tab bar (four tabs + centre FAB)

`Matching · Deals · [+] · Optimise · Journeys`

PRD §6.1 tab order is preserved. The FAB stays centre, brick-filled, `52px`, offset `margin-bottom: 10px` so it sits proud of the bar. Bar: `10px 16px 26px`, `rgba(255,253,249,0.9)` over a `#E4D8D3` top hairline. Icons `21px`, stroke `1.9`, labels `10px`. Active = brick + weight 600; inactive = `--color-ph-text-meta`.

Journeys icon is a paper-plane glyph (`M3 13.5l18-7.5-7 18-2.5-7.5z`) — it doubles as a nod to Perry.

### Second level

Both right-hand tabs use the same segmented control directly under the header — a `999px` pill on `--color-ph-fill`, `4px` padding, active thumb `--color-ph-card` with the small shadow.

- **Optimise** → `Your cards` | `Next card`
- **Journeys** → `Destinations` | `Balances`

Nothing in the app goes deeper than two levels.

### Header

Screen title left (Instrument Serif 28px), icon cluster right — three `34px` tap targets: `⌂` Today (house glyph), Alerts (bell, with a `6px` `--color-ph-red` dot when unread), `☰` Settings. Mute and dark-mode toggles move into Settings; they do not belong on every screen.

Today's own header replaces the title with a mono date eyebrow + serif greeting, and shows the house icon filled (`--color-ph-fill-warm` tile, brick glyph) to mark position.

### What moved, and what to watch

- **Next Card** tab → Optimise sub-tab.
- **Journeys** (was inside Home, reachable only via hamburger) → fourth tab.
- **Point balances** (was a hamburger item) → Journeys sub-tab. Balances are the data behind the destinations; they belong beside them.
- **Today** (was Home) → top-right icon. The hamburger drops to Settings only.
- The **Today / Journeys segmented toggle** at the top of Home disappears entirely — the two screens share no content.

> **Open risk, flagged and accepted for now:** Today holds the optimisation score and the deadline count, and an unlabelled top-right icon will be missed by most users. Either Today becomes the launch screen with tabs below it, or its content migrates into Optimise and Today stops existing. Product decision pending — do not treat the icon as permanent.

---

## Screens

### 1. Today — reached from the top-right ⌂

**Purpose:** the daily glance. Score, three stats, and the two or three things worth doing today.

Layout, top to bottom:

- Header: mono `THURSDAY 20 AUGUST` (9.5px, `0.16em`) over serif `Good afternoon, Tin` (29px). Icon cluster right, house tile active.
- **Score card** — brick, radius 22, padding 20, `display: flex; align-items: center; gap: 18px`. Left: an `84px` ring, `conic-gradient(amber 0deg 281deg, rgba(246,241,233,0.2) 281deg 360deg)` with an `inset: 8px` brick disc holding the serif figure `78` at 32px. Right: mono `OPTIMISATION SCORE` + "Up 6 this week. One move left to lift it again."
- **Stat row** — three equal columns divided by `1px × 34px` `#E0D3CE` rules. Serif figure 26px over a 9px mono label: `$1,240 SPEND TO GO` (ink), `+42,000 THIS MONTH` (pine), `2 DEADLINES` (`--color-ph-amber-figure`).
- Mono section label `DO TODAY`.
- **Action cards** — one per real thing to do. Card 1: serif title + amber `⚠ 19d` chip, one line of body naming the payoff and the amount, then a 7px progress bar. Card 2: serif title + secondary line, `Mark used` pill right.
- **Copilot bar** — pinned bottom with `margin-top: auto`, `margin-bottom: 12px`.

### 2. Optimise · Your cards

**Purpose:** am I going to make the min spend, and is anything unclaimed?

- Active card block: card-art thumb `58×37`, serif card name, "Approved 10 Jun · $1,450/yr", amber `⚠ At risk` chip.
- Min-spend section: mono `MIN SPEND` left / mono `19 DAYS LEFT` amber right; serif `$6,500` at 36px + "to go of $10,000"; 10px brick progress at 35%; then the pace line — **"You need $342 a day. Last 30 days you averaged $180."** This sentence is the point of the screen. Primary red `Log a spend` pill below.
- Divider, then a single benefits summary row: "1 benefit unclaimed · $400 dining" + `Mark used`.
- Secondary card row, collapsed: name + pine `✓ Bonus earned · nothing to do` + `▾`.
- Dashed-border row: "Add a card you already hold" + `+ Add`.
- Reference data (fee dates, expiry, approval details) lives behind a `DETAILS · FEES, DATES` disclosure — see 4a's Optimise screen for that variant.

### 3. Optimise · Next card

**Purpose:** what should I apply for, and why should I believe you?

- Segmented control, then program chips: `All 25` (ink, active) `Qantas 9` `Velocity 5` `Bank 11`. Counts live on the chips. Sort moves to a mono `SORT: BEST ▾` control in the header. **One control set per list** — the current four-row stack of summary, preferences, hidden-cards, count tiles and dropdowns collapses into this.
- **Best-move card:** mono `YOUR BEST MOVE` (brick) + pine `✓ Bonus eligible` chip. Card art `92×58`, serif card name, serif `150,000` in brick + "pts · $370/yr".
- **Evidence panel** — paper-coloured inset, radius 14, three bullets with 5px dots: two pine (eligibility, whether the min spend is realistic _at the user's actual rate_), one amber-brown (net value after fee). This replaces the current unsupported "Safe to apply now".
- Buttons: red `See the play` (flex 1) + outline `Later`.
- Ranked rows below: mono rank number, card art `44×28`, name + "120,000 pts · $375/yr", serif net figure in pine.
- **Ineligible cards stay in the list**, at full opacity, with a `✕ Held in 2025` chip explaining why. A filtered-out card teaches nothing.

### 4. Journeys · Destinations

**Purpose:** what your points actually buy.

- Brick hero: mono `438,200 POINTS BUYS YOU` → serif `6 destinations` (34px) → "in business · 14 in economy". Cabin filter as a paper pill, right-aligned.
- Two-column destination grid. Card = 72px placeholder photo (radius inherits from the 18px card, `overflow: hidden`), then serif city name, "216,000 · Business", and an amber `✓ Book now` chip.
- Mono `ALMOST THERE`, then horizontal rows for out-of-reach destinations: 44px thumb, serif city, cabin + cost, and right-aligned mono `49,800 short` over a 62px progress bar. **Keep these visible** — the gap is the reason to come back next month.

### 5. Journeys · Balances

**Purpose:** where the points sit and whether the numbers are trustworthy.

- Brick hero: mono `TOTAL POINTS` → serif `438,200` (48px) → "4 programs · ≈ $7,413 of value".
- One row per program: 34px logo placeholder, program name, and a mono sync-status line — pine `⚡ AUTO-SYNC · 2MO AGO` or grey `MANUAL`. Serif balance figure right.
- A manual program with no balance shows a red `Add` pill instead of a figure and dims its title to `--color-ph-text-disabled`.
- Auto-sync forwarding address collapses to one tint row: "Auto-sync is on" + the mono address (truncating) + `Copy`.
- Copilot bar pinned as everywhere else.

### 6. Alert Centre — from the header bell

**Purpose:** everything the app wants to tell you, sorted by whether it needs you.

- Header: serif `Alerts` + `Mark all read`. Chips: `All 5` `Deadlines 2` `Wins 3`.
- **Two groups: `NEEDS YOU`, then `GOOD NEWS`.** Cards carry a 3px left accent rail — amber for deadlines, pine for wins, `#DCD2C1` for read/archived.
- Deadline cards: title + mono `19D`, a line quantifying the consequence ("At $180/day you land $2,800 short. You need $342/day."), and **an action button** — red for the primary fix, warm-fill for secondary.
- Win cards: title + age, one line of detail, **no button.** Nothing to do is the point.
- Read items drop to `opacity: 0.66` with a neutral rail.
- Keep the chip counts and the rendered card count in sync.

### 7. The + action sheet

Replaces the radial fan with a labelled list. Full-screen ink scrim at `#2E0A08`, the underlying screen at `opacity: 0.28`, content bottom-aligned, and the FAB morphing to a paper-coloured `×`.

- Mono `WHAT DID YOU DO?` centred.
- Four rows, each a 38px icon tile + title + live context line:
  1. **Log a spend** — paper surface, red icon tile, "Counts toward a min spend". This is the primary; it gets the only light row.
  2. **Add a card** — translucent, "One you already hold"
  3. **Mark a benefit used** — translucent, "2 unclaimed"
  4. **Update a balance** — translucent, "KrisFlyer is manual"
- Bottom: a translucent pill — Perry avatar + `Or just tell Perry: "$2,400 on the Amex"` + mic. **Voice is an alternative, not the default.** The current 170px mic button treats speech as the primary input when typing is more common, and the radial fan duplicates it.

### 8. Log a spend (bottom sheet)

Scrim `rgba(46,10,8,0.42)`. Sheet on `--color-ph-paper`, radius `26px 26px 0 0`, `20px 24px 26px`, grab handle `38×4` `#DCD2C1`.

- Serif `Log a spend` + `Cancel`.
- Mono `AMOUNT`, then a serif `$2,400` at 42px on a `2px` brick underline with a red caret. Numeric keypad.
- Mono `ON WHICH CARD` — card rows, selected one carrying a `1.5px` brick border and a brick check. Each row shows its own stake: "$6,500 to go · 19 days" in amber, or "Bonus already earned" muted.
- **Consequence panel** (tint, radius 14) — "After this spend" / serif `$4,100 to go`, a two-segment progress bar (brick = existing, red = this entry), and "Daily target drops from $342 to **$216**." Show the result before they commit.
- Red `Log it`, full width, radius 999.

### 9. Add a card (bottom sheet)

- Serif `Add a card` + `Cancel`. Search field with magnifier, radius 14.
- Mono `3 MATCHES`. Rows: card art `48×31`, product name, "$1,450/yr · Membership Rewards". Already-held products show a `Held` chip instead of `Add`.
- Mono `WHEN WERE YOU APPROVED?` — three equal segments, `This month` / `Earlier` / `Not sure`, selected one with a `1.5px` brick border. Helper: "Approval date sets your eligibility clock and min-spend window. 'Not sure' is fine — Perry will ask again when it matters."
- Red `Add card`.

### 10. Perry — four moments, silent otherwise

Perry lives as the **Copilot bar avatar** (24–26px brick disc). He is not a floating overlay: in the current app he covers live content on every screen. He leaves the bar for exactly four things:

| Moment                   | Treatment                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resting** (default)    | Avatar in the bar. `Ask Perry anything…` + mic. Nothing covered.                                                                                                                                                                                                                                                                                   |
| **Deadline slipping**    | A speech card above the bar — 30px avatar, `14px 14px 14px 4px` bubble on `--color-ph-card` with `--color-ph-tint-border`: "At $180 a day you miss the Amex bonus by $2,800. Want me to work out what to move onto it?" Buttons `Yes` (red) / `Not now`. **Fires once per deadline**, when the maths first turns against the user. Never repeated. |
| **Bonus cleared**        | Full-bleed brick takeover, once. 46px Perry centred, the figure in amber serif (30px), one line: "Bonus cleared. That is Tokyo, booked." Tap anywhere to dismiss.                                                                                                                                                                                  |
| **Destination unlocked** | Same as above but pine instead of brick. It is good news the user did nothing to earn, so the tone is "the app noticed", not "congratulations".                                                                                                                                                                                                    |
| **First run, no cards**  | Speech card: "Add one card you already hold and I will tell you what you are leaving on the table." One red `Add a card` button, then he waits.                                                                                                                                                                                                    |

**Perry never:** floats over content, appears on load, greets, celebrates a login streak, or says anything twice. A mascot who speaks four times a month is a character; one who speaks on every screen is a cursor. Everything else — tips, nudges, encouragement — goes to the Alert Centre where it can be ignored.

---

## Behaviour rules

These carry across every screen and are the substance of the refresh.

1. **One signature surface.** Brick appears on the hero card of each tab and on Perry. Everything else is paper and hairlines. Max one brick surface per screenful.
2. **Never claim to be empty.** The current home says "nothing urgent today" while two deadlines sit in the tile above it. Action lists derive from the same data as the counts.
3. **Every recommendation shows its reasoning.** Eligibility, feasibility at the user's real spend rate, and net dollars after fees. Net dollars beat raw points as the headline for a decision.
4. **Pace, not reference data.** For any card with a min spend: progress, required daily rate, actual daily rate. Fees, dates and expiry go behind a disclosure.
5. **One control set per list.** Counts on the filter chips; sort in the header; nothing else above the first result.
6. **Ineligible items stay visible** with the reason attached.
7. **Show the gap.** Out-of-reach destinations keep a progress bar and a shortfall figure.
8. **Status = colour + icon + text, always** — never colour alone. Preserve the existing `status-chip.tsx` contract.

## Interactions

- Segmented control: instant switch, thumb slides `180ms ease-out`. Persist the selection per tab for the session.
- Bottom sheets: slide up `240ms cubic-bezier(0.32, 0.72, 0, 1)`, scrim fades to `rgba(46,10,8,0.42)`. Swipe-down and `Cancel` both dismiss.
- - FAB: scrim fades and rows stagger in `40ms` apart, `160ms` each. FAB rotates to `×`.
- Log-a-spend consequence panel recalculates live as the amount changes — the second progress segment and the new daily target animate `200ms`.
- Perry's speech card: fade + `8px` rise, `200ms`. The takeover states hold until tapped.
- `Mark used` resolves optimistically in place to a pine `✓ Used`; no toast.
- Progress bars animate from their previous value on mount, `400ms ease-out`.

## State

- Selected sub-tab per tab (session).
- Active program filter and sort on Next card.
- Card selection and amount in the log-spend sheet; derived preview values (remaining, new daily target).
- Alert read state and group filter.
- Perry: which moments have fired (must be persisted — the deadline prompt is once per deadline, not once per session), and dismissal state for takeovers.
- Existing `store/user-cards.ts` and `lib/projections.ts` already hold the card, spend and projection data these screens read.

## Assets needed

Everything below is a placeholder in the mock and must be sourced before build:

- **Card art** for every product — real Point Hacks product images. Presentation: cream frame, `1px --color-ph-border` hairline, radius 5–9px by size. **Never a tinted gradient** — the issuer's red belongs to the card, not the chrome. Sizes used: `96×61`, `92×58`, `58×37`, `48×31`, `44×28`.
- **Program logos** — Qantas, Velocity, Amex Membership Rewards, Singapore KrisFlyer. 34px tile, radius 9.
- **Destination photography** — Tokyo, Osaka, Seoul, Paris, London. 72–96px card headers, full-bleed.
- **Perry the Points Plane** — one mark legible at 26px in the bar, one for a 46px celebration circle. The plane silhouette could carry motion the disc can't (tilting up as a destination unlocks).
- **Instrument Serif** — Google Fonts, weight 400.

## Two things to validate before you build

1. **Brick surfaces beside real issuer card art.** This is the one test the direction can fail. Westpac, NAB and Virgin all sit in the same red family; a brick hero next to their card art may read as the issuer's own app. Check it with real images first.
2. **Dark mode.** The app already ships a theme toggle. Ink `#2E0A08` becomes the base, brick lifts to the card surface, bright red stays the action, and amber and pine hold at these lightnesses. Not yet designed — worth building before committing.

## Files

- `Brand & UI Direction.dc.html` — the design reference. Approved sections: `6a`, `5a`, `4a`, `3b`. Ignore `1a`, `2a`, `2b`, `2c`, `3a`.
- `ios-frame.jsx`, `support.js` — the prototype's device frame and runtime. Not part of the design; needed only to open the HTML.
- `github.md` — repo association and the screen-to-source map.
