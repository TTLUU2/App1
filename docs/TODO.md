# Point Hacks Copilot — TODO

Living backlog. Update as items move between states. Last touched 2026-06-07.

---

## Now (active or queued for next session)

- **Capacitor + TestFlight setup** — pipeline is scaffolded (`codemagic.yaml`, `apps/web/capacitor.config.ts`, `docs/CAPACITOR_TESTFLIGHT.md`). User to complete the manual steps in the doc: Apple Developer team setup, App Store Connect app registration, Codemagic project link, App Store Connect API key integration named `pointhacks_appstore`, first `mobile/*` branch push.
- **GitHub → Vercel auto-deploy isn't firing** — GitHub integration is connected on the Vercel dashboard but pushes to `main` don't trigger a build. Currently shipping via `vercel deploy --prod` from CLI. Worth checking Production Branch setting + deployment hooks in the project's Git settings page.

## Next (pull when current work clears)

- **Copilot reference data** — seed transfer ratios and award sweet spots into the catalogue, then inject into `buildAskContext()`. Examples: Amex MR → Velocity 1:1, Amex MR → QFF (not direct), QFF sweet spots SYD→HND J 90k pts, etc. Lets the home Copilot mic and `/ask` answer redemption questions with grounded data instead of model-memorised generalities.
- **Consolidate `/ask` into the home Copilot** — both surfaces now share the same brain (`/api/ask` + same context builder). Plan: keep the home mic as the one-shot entry, add a "View conversation" affordance that expands into chat history. Eventually deprecate `/ask` as a separate tab. Sets up a single voice surface across the app.

## Deferred (intentional later)

- **HSBC Platinum Qantas card** — possibly discontinued (404 during seeding). Re-check before shipping the catalogue publicly; remove or mark retired.
- **Tiered earn-rate model** — currently single earn rate per card. Real-world cards have category tiers (e.g. 3pt groceries / 1pt other). Needs a 3-field-per-card schema migration + UI affordance.
- **Native APNS push migration** — currently using web-push with VAPID. Once Capacitor is live, switch iOS push to native APNS via the Capacitor Push Notifications plugin (already configured in `capacitor.config.ts`).
- **Native Capacitor Speech Recognition plugin** — current voice input uses browser SR (with MediaRecorder + ElevenLabs Scribe fallback). Native plugin would be faster and more reliable on iOS, but only worth wiring once the Capacitor wrapper is in TestFlight.

---

## Working principles (so we don't drift)

- Webpack only — no Turbopack (user's machine).
- All icons are `lucide-react`. Never emoji characters in UI strings.
- PAN/CVV never captured or stored.
- Encryption-at-rest waived for v1 (internal testing only).
- Direct Anthropic API key — not Vercel AI Gateway.
- Pointhacks Vercel team is owned by `pointhacks@yotta.ai`.
