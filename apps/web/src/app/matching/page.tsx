import { CreditCard } from 'lucide-react';
import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function MatchingPage() {
  return (
    <PlaceholderScreen
      heading="Card Matching"
      description="We'll match your spend to the cards that earn the most. Coming soon."
      icon={<CreditCard className="h-7 w-7" aria-hidden />}
    />
  );
}
