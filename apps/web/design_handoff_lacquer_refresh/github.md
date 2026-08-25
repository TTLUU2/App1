repo: TTLUU2/App1
branch: main
path: apps/web/src

## Last sync

date: 2026-08-20T02:21:35Z

### Updated in this project

- New IA (5a): Next Card folded into Optimise, Journeys promoted to fourth tab
- Point balances moved out of the hamburger into a Journeys sub-tab
- Confirmed no program-logo assets exist (`apps/web/public/` holds icon.svg only) — marks shown as labelled placeholders
- Program grouping (qantas / velocity / bank) taken from `lib/theme.ts` and `next-card/program-pills.tsx`

## Sync history

- 2026-08-19T13:06:05Z — read theme, tab bar, status chip and card art to ground the rebrand; confirmed `--color-ph-red: #d62828` is a placeholder pending spec; kept PRD §6.1 tab order, the centre FAB fan, and the colour + icon + label rule on status chips

## Screen map

| Project screen                | Repo files                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| Today / home (1a, 2a, 2b, 2c) | `apps/web/src/app/page.tsx`, `apps/web/src/app/matching/page.tsx`                                       |
| Journeys (1a)                 | `apps/web/src/store/user-cards.ts`, `apps/web/src/lib/projections.ts`                                   |
| Next Card (1a)                | `apps/web/src/app/next-card/page.tsx`, `apps/web/src/components/next-card/*`                            |
| Optimise (1a)                 | `apps/web/src/app/optimisation/page.tsx`, `apps/web/src/components/tab3/*`                              |
| Tab bar + FAB (all)           | `apps/web/src/components/tab-bar.tsx`, `apps/web/src/components/fan-actions.tsx`                        |
| Optimise · Next card (5a)     | `apps/web/src/components/next-card/program-pills.tsx`, `apps/web/src/components/next-card/card-row.tsx` |
| Journeys · Balances (5a)      | `apps/web/src/app/matching/page.tsx`, `apps/web/src/lib/theme.ts`                                       |
| Palette + status tokens       | `apps/web/src/lib/theme.ts`, `apps/web/src/app/globals.css`, `apps/web/src/components/status-chip.tsx`  |
