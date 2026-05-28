// Scan flow landing — the camera + Claude Vision OCR pipeline lands in
// Task #9. Until then, route to the manual add form with a note.

import Link from 'next/link';
import { Camera, ChevronLeft } from 'lucide-react';

export default function ScanPage() {
  return (
    <main className="flex-1 px-4 pb-6">
      <div className="flex items-center pt-2">
        <Link
          href="/"
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
      </div>
      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-ph-red)]/10 text-[var(--color-ph-red)]">
          <Camera className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold">Scan card</h1>
        <p className="max-w-xs text-sm text-zinc-600 dark:text-zinc-400">
          Camera capture + Claude Vision OCR is wired in the next commit (Task #9). For now, add
          your card manually.
        </p>
        <Link
          href="/add-card"
          className="mt-2 rounded-full bg-[var(--color-ph-red)] px-4 py-2 text-sm font-medium text-white"
        >
          Open manual form
        </Link>
      </div>
    </main>
  );
}
