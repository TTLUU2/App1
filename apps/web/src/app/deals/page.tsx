import { Gift } from 'lucide-react';
import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function DealsPage() {
  return (
    <PlaceholderScreen
      heading="Deals & Alerts"
      description="Surfacing the best current sign-up bonuses and limited-time offers. Coming soon."
      icon={<Gift className="h-7 w-7" aria-hidden />}
    />
  );
}
