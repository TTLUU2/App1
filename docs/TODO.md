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

### P1.5 — voice-first mic refactor (resolved design, ~1.5 days)

Decision made 2026-06-09: the home Copilot mic should be a **single
unified surface** — every spoken utterance either fires a specific
intent (and executes silently with brief voice ack) OR falls back to
`/api/ask` for a conversational answer. No "didn't understand"
dead-ends.

**Full intent set in one shot:**

- `'spend'` ✅ already exists
- `'benefit'` ✅ already exists
- `'question'` ✅ already exists (routes to `/api/ask`)
- `'add_card'` 🆕 fuzzy-match spoken card name, run existing add-card engine, voice ack "Added X. What's the last four?"
- `'cancel_card'` 🆕 fuzzy-match held card, run cancel flow
- `'set_last4'` 🆕 update most-recently-mentioned card's last4 ("that one ends in 1234")
- `'set_nickname'` 🆕 update most-recently-mentioned card's nickname ("call my westpac the travel card")

**Key behaviour change:** when parser returns `'unknown'` OR `confidence: 'low'`, auto-route the original utterance to `/api/ask` instead of showing an error. The mic becomes a "ask anything, do anything" surface — no syntax to learn.

**Confirmation style:** silent execution + brief voice ack. No "are you sure?" prompts (doubles interactions for marginal safety; user can undo via UI).

**Disambiguation:** if fuzzy match returns multiple cards, Copilot voices the options and waits for the next utterance to disambiguate.

**Files touched:**

- `apps/web/src/app/api/parse/quick-update/route.ts` — extend `kind` enum + add `cardSearchTerm` / `last4Value` / `nicknameValue` fields
- `apps/web/src/lib/card-matcher.ts` 🆕 — fuzzy match utility (single / multiple / none)
- `apps/web/src/components/tab3/card-update-card.tsx` — route each intent to its execution path; track "most-recently-mentioned card" for last4/nickname reference

Best paired with the P1 Perry system prompt lift — the fallback Copilot needs to be sharp because it'll catch more traffic.

### P2 — medium-value

- **Deals tab** _(source: `points-deals` components: `deal-card`, `program-badge`, `program-logo`, `sweet-spot-tag`, `expiring-badge`)_. New `/deals` route in PH Copilot. Ports the atom components, rebuilds the page around our nav + Copilot UX. Skip `deals-browser`, `deal-matcher`, `hero`, `site-header/footer` (marketing chrome). ~half day. Edits needed: Tailwind v4 token names (`paper-warm`, `ink-soft`, `amber-deep`, `navy`, `rounded-card`) → our tokens; `@/lib/*` alias re-point.
- **Enrich card catalogue with transfer partners** _(source: `chatbot PH files/points-genie/backend/app/data/cards.json` — 24 AU cards)_. Mine the `transfer_partners[]` + richer bonus structure fields we don't have. Merge into our catalogue, don't replace. ~2h.
- **Typed CTA directory pattern** _(source: `chatbot PH files/points-genie/backend/app/data/ctas.json`)_. Cleaner than the current ad-hoc hardcoded links scattered through copy. ~1h refactor.
- **Consolidate `/ask` into the home Copilot** — both surfaces now share the same brain. Plan: keep the home mic as the one-shot entry, add a "View conversation" affordance that expands into chat history. Eventually deprecate `/ask` as a separate tab.

### P3 — medium-value with prep work

- **Knowledge MDs as RAG corpus** _(source: `chatbot PH files/points-genie/backend/app/data/knowledge/` — five subdirs `learning/`, `programs/`, `redemptions/`, `seat-alerts/`, `courses/`, each containing markdown files with frontmatter schema `intents`, `programs`, `personas`)_. Ingest as context for "how does X work?" beginner-education questions. ~half day + indexing.
- **WP Courseware AFF content as supplementary RAG corpus** _(source: `chatbot PH files/wp-courseware/` — 11 XML exports ~3.4MB from `australianfrequentflyer.com.au`'s FF intro course)_. Strip WP-Courseware HTML tags before ingestion. ~1 day.
- **Intent classification + slot extraction pattern** _(source: `chatbot PH files/points-genie/backend/app/engine/intent.py` + `slots.py`)_. Port the deterministic-state-machine-around-LLM pattern to TS. Borrow the _pattern_, not the 5-intent taxonomy (theirs is acquisition-funnel; we're portfolio-management).

### Distribution

- **TestFlight Public Link for external testers** — once the build stabilizes from internal testing (~1 week), flip on the public link in App Store Connect → TestFlight → External Testing → toggle "Enable Public Link". Generates a single URL (e.g. `https://testflight.apple.com/join/AbCdEfGh`) that anyone can use to install on iPhone — no team membership required. Max 10,000 installs. Revocable anytime. Killer for casual sharing (text, email, QR sticker, social posts). First external build needs Apple Beta App Review (~24h); subsequent builds usually clear instantly. Share strategy options: family/friends first → small Reddit/AFF community drop → broader points-community share. Pair with a feedback form (Typeform / Tally / etc.) so we capture structured input that feeds the RN-vs-Capacitor decision.

### Other queued items

- **Golden transcripts as eval harness** _(source: `chatbot PH files/04_golden_transcripts.md` — Transcripts 1, 4, 5, 8 are the strongest)_. Use as few-shot examples + regression eval set for Copilot. ~half day.
- **Saved-items / bookmark pattern** _(source: `chatbot PH files/03_data_schemas.md` §5)_. UX addition for Copilot if we want it. Low priority.

## Deferred (intentional later)

- **HSBC Platinum Qantas card** — possibly discontinued (404 during seeding). Re-check before shipping the catalogue publicly; remove or mark retired.
- **Tiered earn-rate model** — currently single earn rate per card. Real-world cards have category tiers (e.g. 3pt groceries / 1pt other). Needs a 3-field-per-card schema migration + UI affordance.
- **Stacking math UI** _(source: `points-deals/BACKLOG.md`)_ — the `stacksWith?: string[]` field exists in the deals type but no UI surfaces it. Pull after Deals tab ships.
- **Email alerts on deals** _(source: `points-deals/BACKLOG.md`)_ — needs magic-link auth + DB. Not now.
- **Native Capacitor plugin pass — the "middle path" before any RN rewrite** — closes ~70% of the perceived gap with React Native without rewriting anything. Sequence by impact:
  - `@capacitor-community/speech-recognition` (~half day) — kills the MediaRecorder→Scribe latency on iOS voice input. Biggest perceived win since voice is central. _Replaces the prior standalone SR-plugin TODO._
  - `@capacitor/push-notifications` (~1 day) — native APNS. Already configured in `capacitor.config.ts`, just needs wiring + a device-token sub-type in the `push_subscriptions` table + `/api/push/subscribe` accepting both shapes + `lib/push.ts` branching to `node-apn`. _Replaces the prior standalone APNS migration TODO._
  - `@capacitor/haptics` (~1h) — taps + confirmations feel iOS-native.
  - `@capacitor/share` (~1h) — native iOS share sheet for "share this card recommendation" type flows.
  - Total: ~2–3 days. Sequence after first TestFlight build + initial user feedback so we know which plugins move the needle most.

## Decisions to revisit

Open architectural questions parked deliberately. Don't act on these without re-evaluating against the trigger condition.

- **React Native / Expo rewrite vs stay on Next.js + Capacitor** — current stack is Next.js 16 + Capacitor WKWebView wrapper. RN/Expo would give us native voice latency, native push, smoother gestures, premium reviewer impression. Trade-offs: ~2–3 weeks port effort, lose web distribution surface OR maintain two codebases, throw away the Codemagic pipeline. **Trigger to revisit:** after first TestFlight build has been used by ~10 real testers for ~2 weeks. **Decision input:** their feedback on voice latency, WebView "texture," gesture lag. **Cheaper middle path first:** the native Capacitor plugin pass listed in Deferred — if that closes the gap, the rewrite isn't worth it. **Reasoning trail:** Next.js was picked because (1) web app concept came first → SEO + share-link distribution matter, (2) `/api/*` co-located with app code, (3) one codebase across web + iOS. Those reasons don't go stale. RN only wins when the native-feel gap becomes a measured problem with users, not a theoretical one.

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
