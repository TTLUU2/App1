import type { Metadata, Viewport } from 'next';
import { TabBar } from '@/components/tab-bar';
import { StoreHydrator } from '@/components/store-hydrator';
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
      <body className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/* Phone-shaped layout: content is centred and capped at max-w-md.
            The bottom tab bar is fixed; we reserve space with bottom padding. */}
        <StoreHydrator />
        <div className="mx-auto flex min-h-dvh max-w-md flex-col pb-24">{children}</div>
        <TabBar />
      </body>
    </html>
  );
}
