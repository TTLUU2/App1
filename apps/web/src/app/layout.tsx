import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Point Hacks Copilot',
  description: 'AU credit-card eligibility & optimisation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
