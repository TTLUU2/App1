import type { Metadata, Viewport } from 'next';
import { TabBar } from '@/components/tab-bar';
import { StoreHydrator } from '@/components/store-hydrator';
import { ThemeToggle, THEME_INIT_SCRIPT } from '@/components/theme-toggle';
import { VoiceToggle } from '@/components/voice-toggle';
import { PerryFAB } from '@/components/perry-fab';
import './globals.css';

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
    <html lang="en-AU" className="h-full antialiased">
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

        {/* Global controls — voice mute + theme toggle. Always visible
            top-right, don't scroll with content. Voice toggle silences
            every speak() call across the app; mic input is independent. */}
        <div className="fixed right-3 top-3 z-40 flex gap-1 rounded-full bg-white/80 p-0.5 backdrop-blur ring-1 ring-zinc-200 dark:bg-zinc-900/80 dark:ring-zinc-800">
          <VoiceToggle />
          <ThemeToggle />
        </div>

        <div className="mx-auto flex min-h-dvh max-w-md flex-col pb-24">{children}</div>
        <TabBar />
        {/* Perry — universal Copilot entry point. Floats bottom-left on
            every screen except /ask (hides itself there). */}
        <PerryFAB />
      </body>
    </html>
  );
}
