// Capacitor config for the iOS wrapper. The app is a thin WKWebView
// host pointing at the production Vercel URL — content updates flow
// through the normal web deploy pipeline, no app re-build needed.
//
// Why remote-URL hosting (not bundled webDir): we have many server
// routes (Anthropic / ElevenLabs / push / Drizzle / Vercel Cron) that
// can't run in a static export. The remote URL keeps the architecture
// single-source-of-truth at /apps/web on Vercel.
//
// The local `capacitor-www` directory holds a tiny loading shell that's
// shown for ~1 frame before WKWebView navigates to server.url. It must
// exist or Capacitor errors during build.
//
// Build target: TestFlight via Codemagic (see codemagic.yaml in repo
// root). Apple Developer enrollment + App Store Connect app must exist
// before the first cloud build runs.

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pointhacks.copilot',
  appName: 'PH Copilot',
  webDir: 'capacitor-www',

  server: {
    // The Vercel production alias. Switch to a staging URL by setting
    // CAP_SERVER_URL in CI for preview-channel builds.
    url: process.env.CAP_SERVER_URL ?? 'https://ph-copilot-gamma.vercel.app',
    cleartext: false,
    // Allowlist for upstream APIs the WKWebView may call directly.
    // (Most calls go through our /api/* routes on the same origin, so
    // this list is conservative.)
    allowNavigation: [
      'ph-copilot-gamma.vercel.app',
      '*.vercel.app',
      'elevenlabs.io',
      '*.elevenlabs.io',
    ],
  },

  ios: {
    // 'always' insets the WKWebView so it respects the iPhone notch +
    // home indicator without our CSS doing extra work.
    contentInset: 'always',
    // White WKWebView background — matches the app's zinc-50 / white
    // body, so the safe-area-inset-bottom strip behind the tab bar
    // doesn't bleed a colour through during scroll bounce. Was '#dc2626'
    // (PH red) which caused a thin red strip below the tab bar.
    backgroundColor: '#ffffff',
    // Tell iOS this is a network-fetched experience so cleartext checks
    // and security policies are applied correctly.
    scheme: 'PHCopilot',
  },

  plugins: {
    PushNotifications: {
      // Native APNS path — registers the device with our /api/push/
      // subscribe endpoint on app launch. Replaces the web-push path
      // when the user is running the native wrapper.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      // 3000ms gives the user a beat to register the brand before the
      // app loads. Don't push past this — Capacitor blocks interaction
      // during the splash window.
      launchShowDuration: 3000,
      // Matches the navy gradient in apps/web/capacitor-assets/splash.png.
      // If you update the splash artwork, sample the dominant colour
      // and update this too so there's no flash at the edges.
      backgroundColor: '#1a4e6b',
      showSpinner: false,
    },
  },
};

export default config;
