# Claude Code Kickoff Prompt — Point Hacks Copilot Mobile App

> Paste the prompt below into Claude Code at the root of an empty directory where you want the new mobile-app monorepo to live.
> Confirm the file paths match your machine before pasting.

---

## The prompt

You are kicking off a brand-new React Native / Expo mobile app called **Point Hacks Copilot**. This is the foundation work (milestones M0 and M1 in the PRD). Read everything below carefully and ask any clarifying questions BEFORE writing code.

### Source of truth

Read / visit these in this order:

1. `/Users/tinluu/Downloads/PH App/PointHacksCopilot_PRD_v1.0.docx` — the full PRD. Treat this as the single source of truth for product behaviour. If you find yourself about to deviate from the PRD, stop and ask.
2. **The deployed eligibility prototype: https://mobile-asset-matrix.replit.app** (the project is called "BonusSafe" internally). This is the working web version of the eligibility engine and is **the ground truth for the rules.** Visit it, exercise every screen, and inspect its source — the schema, the engine integration, the rule application, and the UI patterns it uses for results display. The mobile app must reproduce the same eligibility outcomes for the same inputs.
3. `/Users/tinluu/Downloads/PH App/Bonus Eligibility Reference/eligibility-engine.ts` — the pure-functional eligibility engine. Port this **unchanged in its computational core** (functions `calculateEligibility` and `generateRecommendations`).
4. `/Users/tinluu/Downloads/PH App/Bonus Eligibility Reference/seed.ts` — the issuer and card catalogue. Ship this bundled with the app as JSON.
5. `/Users/tinluu/Downloads/PH App/Screenshot 2026-02-03 at 3.05.50 pm.png` — **the eligibility matrix.** This is a From / To grid showing, for every issuer pair, whether a user currently holding a card on the left can apply for a card on the top and the rule that applies. **The mobile app's eligibility results must agree with this matrix on every cell.** Use the matrix as your authoritative reference when testing your port of the engine — write unit tests that walk every populated cell and assert the engine's output matches. Cell-level rules to encode include:
   - Amex Personal → Amex Personal: blocked for 18 months if any personal Amex held (the existing engine handles this).
   - Amex personal and Amex business are separate pools (business doesn't block personal and vice versa).
   - ANZ FF ↔ ANZ Rewards: 24-month issuer-wide block — holding either blocks the other.
   - Westpac Altitude: 24-month family-wide block (QF / Rewards / Velocity Altitude variants are the same family).
   - NAB Rewards and NAB Qantas: 18-month family-wide block within each family; they are _different families_, so holding one does not block the other.
   - Qantas Money Premier: 12-month within-family block, plus a possible 24-month QFF "first-time" overlay on specific offers.
   - Citi: blocked only if you currently hold another Citi card; no fixed waiting period otherwise.
   - HSBC: offer-specific blackout; often no fixed waiting period (grey area — surface notes from `seed.ts`).
6. `/Users/tinluu/Downloads/PH App/Bonus Eligibility Reference/*.png` — eight reference screenshots of the BonusSafe web prototype. Define the v1 visual baseline for Tab 4 and the Add-Card flow.
7. **Card offers, card art, and product detail: https://www.pointhacks.com.au/credit-cards/** — this is the canonical Point Hacks source for current Australian card offers (bonus points, annual fee, minimum-spend requirements, T&Cs links) and card art. Use it as the upstream reference when extending or refreshing the bundled card catalogue. Per-card detail pages off this index (e.g., the Amex Platinum page) are the link target for the "Read guide" CTA in PRD §10.3.

### What you are building in this run

**M0 — Project foundation:**

- Brand new monorepo at the current working directory. Suggested layout: `apps/mobile` for the React Native / Expo app, `packages/shared` for the eligibility engine + card catalogue + shared TypeScript types. Use npm or pnpm workspaces (your call — pick whichever you can configure cleanly in one go).
- TypeScript end-to-end, strict mode on.
- React Native via Expo SDK (current stable, managed workflow).
- React Navigation with a bottom-tab navigator and a stack on top.
- Local data store: pick **one** of Expo SQLite (with SQLCipher for encryption-at-rest) or WatermelonDB. Justify your pick briefly in the README. Use UUIDs (not auto-increment ids) on every mutable row so the schema is portable to a future cloud sync.
- Linting (ESLint + @typescript-eslint), formatting (Prettier), pre-commit hook (husky + lint-staged), and a basic CI workflow file (GitHub Actions) that runs typecheck + lint + tests.
- A `README.md` explaining how to install, run on iOS, run on Android, run tests, and where to find the PRD.
- Port the eligibility engine into `packages/shared` as a pure-functional module. Define the schema types (`Issuer`, `Card`, `CardWithIssuer`, `UserCard`, `UserCardWithDetails`, `EligibilityResult`, `EligibilityStatus`, `Recommendation`) cleanly — derive them from the deployed BonusSafe prototype if possible, otherwise from how `eligibility-engine.ts` uses them. The engine must have **zero React Native dependencies** so it can be reused by web / extension surfaces later.
- Ship `seed.ts`'s issuer and card data as a bundled JSON file inside `packages/shared`. The mobile app loads it at startup.
- **Eligibility-matrix conformance tests.** Write a test suite that encodes every populated cell of the matrix screenshot (`Screenshot 2026-02-03 at 3.05.50 pm.png`) as a fixture: given a user holding the row-card, applying for the column-card yields the expected status (eligible / not_eligible / grey_area / waiting) and the expected reason category. Every cell in the matrix is a test case. The suite must pass before this milestone is considered done.
- Additional unit tests covering: every issuer type (first_time_only, new_to_bank, once_per_card with the Amex 18-month carve-out, time_based with each scope), every status (eligible, waiting, grey_area, not_eligible), and the ranking in `generateRecommendations`. Use Vitest or Jest — your call.

**M1 — Tab 4 vertical slice (the only feature-complete tab in this run):**

- The four bottom-tab shell exists (tabs in fixed order: Card Matching, Deals & Alerts, Card Optimisation, Next Card). Tabs 1, 2, and 3 are placeholder screens with a heading and a "Coming soon" state per PRD §7, §8. Tab 4 is fully implemented per PRD §10.
- A central Floating Action Button sits in the middle of the tab bar (per PRD §6.2). In this milestone the FAB's only working action is **"Add card to history (manual)"** — a form-based card-add flow modelled on the reference screenshot `Screenshot 2026-05-27 at 11.31.46 pm.png` (the "Add Card to History" modal). Camera-based OCR (PRD §11.2) is **out of scope** for this run and the FAB sheet should show the camera entry as "Coming soon".
- Tab 4 ("Next Card") implements per PRD §10:
  - "Your best move" hero (rank #1 from `generateRecommendations`).
  - Eligible-cards summary tiles grouped by FF program (Qantas, Velocity, Bank/flexible).
  - "Upcoming" list of `waiting` results sorted by `daysRemaining`.
  - Collapsible "Grey area" and "Not eligible" sections.
  - Per-card eligibility detail screen on tap, showing status, confidence, reason string, issuer rules summary from `seed.ts`, eligibility countdown for `waiting`, and a "Mark as applied" / "Mark as held" action that writes back to the local store.
  - Sort/filter controls per PRD §10.6.
- Cross-tab plumbing in place: adding a card via the FAB updates Tab 4's results within 1s on the same render.
- Persist all user data locally in the chosen DB. Encrypt at rest. On first launch, the DB is empty; the user can use the FAB to add cards manually.
- Generate a small fixture-data seeder hidden behind a dev menu (e.g., long-press the app header) so I can populate a sample user with a few held + cancelled cards for demoing Tab 4 without manually entering them every run.

### Non-negotiable constraints (read twice)

- **No PAN, no CVV ever persisted.** In this milestone the manual card-add flow can capture the card product, expiry month/year, application date, and a nickname. It must **not** ask for or store a full card number or CVV. Last-4-digits as an optional field is fine. If you write a card-number text field at all, validate that nothing 13–19 digits is ever written to disk.
- **Local-only.** No backend, no API calls for user data in this milestone. Voice and OCR vendors are not wired in this run.
- **Eligibility engine purity.** Port the engine's pure functions verbatim where possible. Wrap them in adapter code if needed but do not modify the rules. Where the engine references `@shared/schema` types, recreate the types cleanly — do not invent new rules.
- **Matrix is the contract.** The eligibility matrix screenshot is the rule contract. If your engine port produces a different verdict for any cell, the port is wrong — fix the port, not the matrix. If the matrix and `seed.ts` disagree on a specific issuer's rule, the matrix wins; raise it with me before changing anything.
- **Accessibility from day one.** Every interactive element labelled for VoiceOver/TalkBack. Layouts must reflow at 200% dynamic type. Status chip colour is not the only signal — also use shape/icon/text.
- **AU only.** AUD, en-AU, no other locales in this milestone.
- **iOS 16+, Android 11+.** Target one common build of Expo SDK that supports both.

### Definition of done for this run

You are done when ALL of the following are true:

1. `pnpm install && pnpm dev` (or `npm install && npm run dev` — whichever you set up) launches the Expo dev server.
2. The app boots on the iOS Simulator and Android emulator and shows the four-tab shell.
3. Tab 4 renders with the seeded card catalogue. With zero user cards added, every catalogue card shows status `eligible`.
4. Using the FAB → "Add card to history (manual)" flow, I can add a card I supposedly hold. Tab 4 immediately recomputes and reflects the new eligibility picture.
5. Tapping any card in Tab 4 opens a detail screen with the eligibility verdict, confidence, reason, and issuer rules.
6. The dev menu seeder populates a realistic sample dataset.
7. `pnpm test` (or `npm test`) passes; the eligibility-matrix conformance suite is green (every populated cell of the matrix screenshot is a passing test case), and the additional engine unit tests listed under M0 are green.
8. `pnpm typecheck` and `pnpm lint` pass with zero errors.
9. CI workflow runs typecheck + lint + tests on push and passes.
10. The README explains the architecture, the choices you made on DB and workspace tool, and how to run everything.

### How to work

- Before writing code, produce a short plan (≤1 page) of the file structure, package layout, and key decisions (DB choice, workspace tool, navigation strategy, state-management strategy). Show me that plan and pause for sign-off before scaffolding.
- After the plan is approved, scaffold the monorepo and the engine port. Run typecheck and tests. Commit.
- Then build the Tab 4 slice. Commit at logical boundaries (every screen, every cross-cutting concern).
- If you hit a gap in my source material (e.g., the prototype URL doesn't expose schema source), flag it clearly and propose a workaround rather than blocking silently.
- If the PRD and your judgment disagree, the PRD wins unless you can explain why your alternative is strictly better — and then you ask me before deviating.
- Surface assumptions explicitly. At the end of the run, give me a short "Decisions and assumptions" document listing every non-trivial choice you made.

### Out of scope for this run (defer to later milestones — do NOT build)

- Camera capture + AI card OCR (PRD §11.2, §13).
- Voice-driven spend updates and benefit redemption (PRD §11.3, §11.4, §12).
- "Ask Copilot" voice assistant (PRD §11.5).
- Tab 3 (Card Optimisation) — placeholder only in this run.
- Card Alert Centre and push notifications (PRD §15).
- Frequent flyer account linking and deep-link (PRD §14).
- Anything inside Tabs 1 and 2 beyond the placeholder.

### Start by

1. Reading the PRD and the engine + seed files listed above.
2. Visiting **https://mobile-asset-matrix.replit.app** (BonusSafe) and inspecting it for the schema, the rule application, and any behaviour the `.ts` file alone doesn't make obvious.
3. Loading the eligibility matrix screenshot and confirming you can read every cell — this is the rule contract your tests will encode.
4. Browsing **https://www.pointhacks.com.au/credit-cards/** so you understand the canonical card-offer source you'll be aligning the bundled catalogue against (and link-targeting from the "Read guide" CTA).
5. Producing the plan described under "How to work" and pausing for sign-off.

Go.

---

## After Claude Code finishes

When the M0+M1 run is complete, the natural next prompts (one at a time, not all at once) are:

1. **M2 — Tab 3 + voice/text spend & benefit updates.** Provide benefit metadata per card before kicking this off (the PRD references `trackableBenefits[]` but the seed doesn't include them yet).
2. **M3 — FAB camera/OCR + Ask Copilot voice assistant.** Decide vendors before this milestone (Whisper Flow vs alternatives for STT/TTS; Claude Vision / GPT-4V / on-device for OCR).
3. **M4 — Card Alert Centre + local push notifications.**
4. **M5 — Closed beta polish.**

Keep each prompt bounded to one milestone — Claude Code is most reliable when the scope is clear and the definition of done is testable.
