import { Suspense } from 'react';
import { SpendFlow } from '@/components/spend/spend-flow';

export default function SpendPage() {
  // useSearchParams requires a Suspense boundary in Next.js 16+.
  return (
    <Suspense fallback={<main className="p-6 text-sm text-ph-text-meta">Loading…</main>}>
      <SpendFlow />
    </Suspense>
  );
}
