# Point Hacks Copilot — TODO

Living backlog. Update as items move between states. Last touched 2026-06-09.

---

## Now (active or queued for next session)

- **Capacitor + TestFlight setup** — pipeline is scaffolded (`codemagic.yaml`, `apps/web/capacitor.config.ts`, `docs/CAPACITOR_TESTFLIGHT.md`). Apple Developer enrollment ✅ done. User to complete: Codemagic signup + repo link, App Store Connect API key (.p8 + Key ID + Issuer ID), Codemagic integration named `pointhacks_appstore`, App Store Connect app record with bundle ID `com.pointhacks.copilot`, first `mobile/*` branch push. Then ~24h Apple internal review.
- **GitHub → Vercel auto-deploy isn't firing** — GitHub integration is connected on the Vercel dashboard but pushes to `main` don't trigger a build. Currently shipping via `vercel deploy --prod` from CLI. Worth checking Production Branch setting + deployment hooks in the project's Git settings page.

## Next (pull when current work clears)

Many items below trace back to the `points-deals` and `chatbot PH files` scouting reports (2026-06-09). Sources noted in italics.

### P1 — high-value, low-risk

- **Lift "Perry" system prompt into `/api/ask`** _(source: `chatbot PH files/02_system_prompt.md` IDENTITY + TONE + CORE RULES + KNOWLEDGE GUARDRAILS blocks; cross-check newer version at `chatbot PH files/points-genie/backend/app/llm/system_prompt.py`)_. Strip the 5-intent Perry-specific flow scripts. Sharper Aussie voice, hard no-fabrication guardrails, "never call yourself an AI" rule, anti-emoji rule. ~30 min. Single biggest quality lift available.
- **Copilot reference data — sweet spots + CPP + deals** _(source: `points-deals/lib/sweet-spots.json` 318 lines, `points-deals/lib/cpp.ts`, `points-deals/data/deals.json` ~15 deals)_. Import as `apps/web/src/data/*`, inject into `buildAskContext()`. Grounds redemption answers ("good QFF redemption?") and unlocks deal-stacking answers ("what deals stack with my Amex spend?"). Replaces the original "Copilot reference data" bullet — most of the work already exists. ~1h.
- **Route × program × cabin matrix** _(source: `chatbot PH files/points-genie/backend/app/data/points_requirements.json`)_. Drop-in lookup table for "how many points SYD→HND J?" type questions. Stops model from hallucinating routings. ~1h.

### P2 — medium-value

- **Deals tab** _(source: `points-deals` components: `deal-card`, `program-badge`, `program-logo`, `sweet-spot-tag`, `expiring-badge`)_. New `/deals` route in PH Copilot. Ports the atom components, rebuilds the page around our nav + Copilot UX. Skip `deals-browser`, `deal-matcher`, `hero`, `site-header/footer` (marketing chrome). ~half day. Edits needed: Tailwind v4 token names (`paper-warm`, `ink-soft`, `amber-deep`, `navy`, `rounded-card`) → our tokens; `@/lib/*` alias re-point.
- **Enrich card catalogue with transfer partners** _(source: `chatbot PH files/points-genie/backend/app/data/cards.json` — 24 AU cards)_. Mine the `transfer_partners[]` + richer bonus structure fields we don't have. Merge into our catalogue, don't replace. ~2h.
- **Typed CTA directory pattern** _(source: `chatbot PH files/points-genie/backend/app/data/ctas.json`)_. Cleaner than the current ad-hoc hardcoded links scattered through copy. ~1h refactor.
- **Consolidate `/ask` into the home Copilot** — both surfaces now share the same brain. Plan: keep the home mic as the one-shot entry, add a "View conversation" affordance that expands into chat history. Eventually deprecate `/ask` as a separate tab.

### P3 — medium-value with prep work

- **Knowledge MDs as RAG corpus** _(source: `chatbot PH files/points-genie/backend/app/data/knowledge/{learning,programs,redemptions,seat-alerts,courses}/_.md`— with frontmatter schema`intents`, `programs`, `personas`)\*. Ingest as context for "how does X work?" beginner-education questions. ~half day + indexing.
- **WP Courseware AFF content as supplementary RAG corpus** _(source: `chatbot PH files/wp-courseware/` — 11 XML exports ~3.4MB from `australianfrequentflyer.com.au`'s FF intro course)_. Strip WP-Courseware HTML tags before ingestion. ~1 day.
- **Intent classification + slot extraction pattern** _(source: `chatbot PH files/points-genie/backend/app/engine/intent.py` + `slots.py`)_. Port the deterministic-state-machine-around-LLM pattern to TS. Borrow the _pattern_, not the 5-intent taxonomy (theirs is acquisition-funnel; we're portfolio-management).

### Other queued items

- **Golden transcripts as eval harness** _(source: `chatbot PH files/04_golden_transcripts.md` — Transcripts 1, 4, 5, 8 are the strongest)_. Use as few-shot examples + regression eval set for Copilot. ~half day.
- **Saved-items / bookmark pattern** _(source: `chatbot PH files/03_data_schemas.md` §5)_. UX addition for Copilot if we want it. Low priority.

## Deferred (intentional later)

- **HSBC Platinum Qantas card** — possibly discontinued (404 during seeding). Re-check before shipping the catalogue publicly; remove or mark retired.
- **Tiered earn-rate model** — currently single earn rate per card. Real-world cards have category tiers (e.g. 3pt groceries / 1pt other). Needs a 3-field-per-card schema migration + UI affordance.
- **Stacking math UI** _(source: `points-deals/BACKLOG.md`)_ — the `stacksWith?: string[]` field exists in the deals type but no UI surfaces it. Pull after Deals tab ships.
- **Email alerts on deals** _(source: `points-deals/BACKLOG.md`)_ — needs magic-link auth + DB. Not now.
- **Native APNS push migration** — currently using web-push with VAPID. Once Capacitor is live, switch iOS push to native APNS via the Capacitor Push Notifications plugin (already configured in `capacitor.config.ts`).
- **Native Capacitor Speech Recognition plugin** — current voice input uses browser SR (with MediaRecorder + ElevenLabs Scribe fallback). Native plugin would be faster and more reliable on iOS, but only worth wiring once the Capacitor wrapper is in TestFlight.

## Skip (decided against)

- **Points Genie Python FastAPI backend** — wrong stack (we're Next.js 16). Borrow logic patterns, never code.
- **Points Genie Vite IIFE widget frontend** — rebuilding inside Next.js is faster than porting.
- **`points-deals` marketing pages** (`hero`, `site-header`, `site-footer`, `deal-matcher` multi-step quiz) — overlap heavily with our Copilot conversational surface. Lift data, leave the pages.
- **Brand PNGs from `chatbot PH files/brand/`, `Finder UI/`, `Mobile UI issues/`** — design refs only, no extractable assets. Brand colour `#1A56DB` is the one number worth noting.
- **Points Genie's 5-intent framework wholesale** (LEARNING / CARD_MATCH / SEAT_ALERTS / ARTICLE_FOLLOWUP / OTHER) — wrong taxonomy for our portfolio-management framing.

---

## Working principles (so we don't drift)

- Webpack only — no Turbopack (user's machine).
- All icons are `lucide-react`. Never emoji characters in UI strings.
- PAN/CVV never captured or stored.
- Encryption-at-rest waived for v1 (internal testing only).
- Direct Anthropic API key — not Vercel AI Gateway.
- Pointhacks Vercel team is owned by `pointhacks@yotta.ai`.
