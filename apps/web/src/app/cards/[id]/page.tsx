// Per-card detail screen route. Next.js 15+ requires async params.

import { CardDetailWithId } from '@/components/next-card/card-detail';

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CardDetailWithId id={id} />;
}
