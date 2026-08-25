import type { Metadata, Viewport } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { TabBar } from '@/components/tab-bar';
import { StoreHydrator } from '@/components/store-hydrator';
import { THEME_INIT_SCRIPT } from '@/components/theme-toggle';
import { LacquerHeaderCluster } from '@/components/lacquer/header-cluster';
import { PushOptInModal } from '@/components/push-opt-in-modal';
import './globals.css';

// Instrument Serif — Lacquer's display face (Decision #33). Weight 400
// only, per the spec: "Never bold it; the serif carries the premium tone
// through size, not weight." `next/font/google` self-hosts the file at
// build time so there's no third-party font request at load — critical
// for the Capacitor WKWebView, which doesn't benefit from a warm CDN
// cache the way a fresh browser tab does.
//
// The `variable` here binds to `--font-instrument-serif` in the CSS
// custom-property tree; globals.css's `--font-serif` token points at it,
// which in turn is Tailwind's binding for the `font-serif` utility. Net:
// every `font-serif` callsite in the app now paints in Instrument Serif.
const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-serif',
});

export const metadata: Metadata = {
  title: 'Point Hacks Copilot',
  description: 'AU credit-card eligibility & optimisation',
  // PWA install path — manifest tells the browser the app is installable;
  // appleWebApp + apple-touch-icon (linked below in <head>) are required
  // for iOS 16.4+ Add-to-Home-Screen support, which is the only way web
  // push notifications work on iOS.
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PH Copilot',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#d62828',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" className={`h-full antialiased ${instrumentSerif.variable}`}>
      <head>
        {/* Pre-paint theme init — runs synchronously before React hydrates so
            the .dark class is on <html> before the first paint. Eliminates
            the flash-of-wrong-theme on reload. See theme-toggle.tsx. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/* Phone-shaped layout: content is centred and capped at max-w-md.
            The bottom tab bar is fixed; we reserve space with bottom padding. */}
        <StoreHydrator />

        {/* Lacquer top-right cluster (Phase 3): ⌂ Today, bell, ☰ Settings.
            Voice mute + theme toggle relocated into Settings — they
            don't belong on every screen (HANDOFF § Header). Balances
            / Home menu items dropped: they moved to the tab bar. */}
        <LacquerHeaderCluster />

        <div className="mx-auto flex min-h-dvh max-w-md flex-col pb-24">{children}</div>
        <TabBar />
        {/* Copilot entry point is the tab-bar '+' fan (Ask/Spend/Benefits/
            Add-card). Perry no longer hovers ambiently on every screen —
            he lives on the /ask chat surface where he actually speaks
            (header avatar + per-reply avatar). Dropped 2026-08-25. */}
        {/* One-time push opt-in modal — fires after the user has at least
            one card in their portfolio. Self-gates via the alerts store. */}
        <PushOptInModal />
      </body>
    </html>
  );
}
