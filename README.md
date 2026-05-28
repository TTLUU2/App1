# Point Hacks Copilot

AU credit-card eligibility & optimisation app. v1 (M0+M1) is a Next.js web prototype
deployed to a URL for internal testing of the card-scanning OCR flow; native mobile
(per PRD §22.1) is deferred.

## Why web first

The original PRD targets React Native via Expo. After scoping conversations during
M0+M1 kickoff, we pivoted to a Next.js web prototype to de-risk the riskiest
unknown — card OCR accuracy — without paying the native-build tax. The shared
eligibility engine is pure TypeScript and will port unchanged to the future native
build. See `docs/DECISIONS.md` (written at the end of M1) for the full rationale.

## Layout

```
.
├── apps/
│   └── web/                  Next.js 16 web app (the v1 prototype surface)
├── packages/
│   └── shared/               Engine + types + card catalogue (zero UI deps)
├── docs/                     PRD, prototype reference, screenshots, decisions log
└── (root tooling)            pnpm workspace, ESLint, Prettier, husky, lint-staged
```

## Prerequisites

- Node 20+
- pnpm 10+ (`corepack enable && corepack prepare pnpm@latest --activate`)

## Install

```bash
pnpm install
```

## Run the web app (development)

```bash
pnpm dev          # starts apps/web on http://localhost:3000
```

## Run tests

```bash
pnpm test         # runs Vitest across all workspace packages
```

## Typecheck and lint

```bash
pnpm typecheck
pnpm lint
```

## Reference materials

The source-of-truth product spec is in `docs/`:

- `docs/PointHacksCopilot_PRD_v1.0.docx` — PRD v1.0
- `docs/Claude_Code_Kickoff_Prompt.md` — engineering kickoff prompt
- `docs/Bonus Eligibility Reference/` — pre-pivot prototype + reference screenshots
- `docs/Notifications Reference/` — alert-centre presentation deck and screenshots

## Configuration

The web app needs an Anthropic API key for the card-scan OCR endpoint:

```bash
cd apps/web
cp .env.example .env.local    # then edit .env.local and paste your key
```

The rest of the app runs without a key — only the OCR endpoint requires it.
