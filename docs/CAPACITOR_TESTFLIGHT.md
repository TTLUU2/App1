# Capacitor iOS → TestFlight setup

End-to-end guide to getting the web app into TestFlight via Capacitor +
Codemagic, with no Mac required at any step.

---

## What you have already

- ✅ `apps/web/capacitor.config.ts` — Capacitor config pointing at the
  production Vercel URL
- ✅ `apps/web/capacitor-www/index.html` — loading shell shown for one
  frame before WKWebView navigates to the live URL
- ✅ `codemagic.yaml` — Codemagic CI workflow that builds + archives +
  uploads to TestFlight on each `mobile/*` branch push
- ✅ npm scripts in `apps/web`: `cap:add:ios`, `cap:sync`,
  `cap:open:ios`, `cap:assets`

## What you still need to do

Three accounts + a few credentials. Plan on ~30 min hands-on plus a
24–48h wait for Apple to verify your developer enrollment.

### 1. Apple Developer Program enrollment (~10 min + 24–48h wait)

1. Go to <https://developer.apple.com/programs/enroll/>
2. Sign in with your Apple ID (create one if needed — use a long-lived
   email, not a throwaway)
3. Choose **Individual** (or Organization if you have an ABN and want
   the business listing on the App Store). Individual is fastest;
   Organization needs a DUNS number and ~5 day verification.
4. Pay the **$99 USD/yr** enrollment fee
5. Wait for verification email (typically <48h, often same day)

While waiting, you can do steps 2 and 3.

### 2. Codemagic account (~5 min)

1. Sign up at <https://codemagic.io/signup> with your GitHub login
2. Click **Add application** → pick GitHub → grant access to `TTLUU2/App1`
3. Codemagic detects the existing `codemagic.yaml` automatically
4. Don't trigger a build yet — credentials come next

### 3. App Store Connect API key (~5 min, AFTER Apple Dev is verified)

This is the credential Codemagic uses to upload builds without
interactive auth.

1. Log into <https://appstoreconnect.apple.com/access/integrations/api>
2. Click the **+** next to "Active" keys
3. Name: `Codemagic Upload`
4. Access: **Developer** is enough for TestFlight uploads
5. Click **Generate** → **download the `.p8` file** (you can only
   download it once — save it somewhere safe)
6. Copy the **Key ID** and **Issuer ID** shown on the page

### 4. Wire credentials into Codemagic (~5 min)

1. In Codemagic: **Teams → Personal → Integrations → App Store Connect**
2. Add new integration with name `pointhacks_appstore` (must match the
   `integrations.app_store_connect` value in `codemagic.yaml`)
3. Paste the Issuer ID + Key ID, and upload the `.p8` file
4. Save

### 5. Create the App Store Connect app record (~5 min)

You need an "app" in App Store Connect before TestFlight can accept
uploads.

1. Log into <https://appstoreconnect.apple.com/apps>
2. Click **+** → **New App**
3. Fill in:
   - **Platforms**: iOS
   - **Name**: `PH Copilot` (must be globally unique on the store)
   - **Primary Language**: English (Australia)
   - **Bundle ID**: select `com.pointhacks.copilot` from the dropdown
     - If it's not in the dropdown: go to
       <https://developer.apple.com/account/resources/identifiers/list>
       → register a new App ID with that bundle ID first
   - **SKU**: any unique string — `ph-copilot-001` is fine
4. Save

### 6. Trigger your first build

1. From your local terminal:
   ```bash
   git checkout -b mobile/first-build
   git push -u origin mobile/first-build
   ```
2. Codemagic detects the push, runs `codemagic.yaml`, takes ~10 minutes
3. Build artifact appears in App Store Connect → TestFlight within ~5
   min of build completion
4. Apple's internal review takes ~24h for the first build (subsequent
   builds usually <1h)

### 7. Install on your phone

1. On iPhone, install **TestFlight** from the App Store
2. Open App Store Connect → Users and Access → invite yourself as an
   internal tester
3. You'll get a TestFlight invite email — accept
4. App appears in TestFlight, install, launch

---

## What the build actually does

Each cloud build:

1. Spins up a macOS Mac Mini M2 VM
2. Installs Node 20 + pnpm 10
3. `pnpm install --frozen-lockfile` at the repo root
4. `cd apps/web && npx cap add ios` — generates a fresh Xcode project
   from `capacitor.config.ts`
5. `npx cap sync ios` — copies webDir + plugin native code
6. `pod install` — pulls Capacitor Swift dependencies
7. `xcodebuild` archives + exports the signed `.ipa`
8. Uploads to App Store Connect via the API key

We **don't commit the generated `ios/` directory** — regenerating each
build is fast (~30s for `cap add ios`) and avoids merge conflicts on
Capacitor version bumps.

## Updating the live app

Two paths depending on what changed:

- **Web content / API changes** — just push to `main`. Vercel
  auto-deploys. The TestFlight app picks up the new content on next
  launch (it's a WKWebView pointed at the live URL).

- **Native iOS changes** — Capacitor config, plugin updates, icon
  changes, new permissions. Push to `mobile/*` branch → new build →
  new TestFlight version. Users install via TestFlight.

## Known follow-ups

Once the basic wrapper is running on TestFlight, these are the iOS-
specific upgrades worth tackling in order:

1. **Native push (APNS)** — add `@capacitor/push-notifications` plugin
   integration. New device-token sub-type in the
   `push_subscriptions` table. `/api/push/subscribe` handles both
   shapes. `lib/push.ts` branches to `node-apn` for APNS endpoints.
   ~1 day.
2. **Native voice (Speech Recognition)** — web `SpeechRecognition`
   works poorly in WKWebView. Plugin candidate:
   `@capacitor-community/speech-recognition`. ~half day.
3. **App icons** — generate from a high-res source via `pnpm cap:assets`
   (drop a 1024×1024 PNG at `apps/web/capacitor-assets/icon.png`
   first). ~30 min including artwork.
4. **Splash screen polish** — currently the loading HTML shell. Could
   add a proper SplashScreen plugin asset.
5. **App Store metadata** — screenshots, description, keywords,
   privacy policy URL. Required before submitting for App Store review
   (vs TestFlight which is more permissive).

## Costs

|                                |                                   |
| ------------------------------ | --------------------------------- |
| Apple Developer Program        | **$99 USD/yr**                    |
| Codemagic free tier            | 500 build min/month (~40 builds)  |
| Codemagic paid (if you exceed) | $0.038/build minute pay-as-you-go |
| **Annual minimum**             | **~$99 USD** for low-volume       |

## Things that will go wrong (and probably are fine)

- **First build fails on signing.** Almost always missing `.p8` upload
  or wrong Issuer/Key ID. Re-paste credentials in Codemagic UI.
- **Build succeeds, TestFlight rejects.** Bundle ID mismatch between
  Codemagic and App Store Connect. Verify both match
  `com.pointhacks.copilot` exactly.
- **App opens to a white screen.** Server URL in `capacitor.config.ts`
  is wrong / unreachable / blocked by ATS. Check
  `allowNavigation` allowlist.
- **Push doesn't work.** Web push still works on the wrapper as long as
  the user added the site to home screen pre-Capacitor. For new
  installs, APNS migration (follow-up #1 above) is required.
