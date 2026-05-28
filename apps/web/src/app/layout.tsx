import type { Metadata, Viewport } from 'next';
import { TabBar } from '@/components/tab-bar';
import { StoreHydrator } from '@/components/store-hydrator';
import { ThemeToggle, THEME_INIT_SCRIPT } from '@/components/theme-toggle';
import './globals.css';

export const metadata: Metadata = {
  title: 'Point Hacks Copilot',
  description: 'AU credit-card eligibility & optimisation',
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

        {/* Global theme toggle — always visible top-right, doesn't scroll. */}
        <div className="fixed right-3 top-3 z-40">
          <div className="rounded-full bg-white/80 backdrop-blur ring-1 ring-zinc-200 dark:bg-zinc-900/80 dark:ring-zinc-800">
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto flex min-h-dvh max-w-md flex-col pb-24">{children}</div>
        <TabBar />
      </body>
    </html>
  );
}
