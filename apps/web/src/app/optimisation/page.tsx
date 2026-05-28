import { TrendingUp } from 'lucide-react';
import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function OptimisationPage() {
  return (
    <PlaceholderScreen
      heading="Card Optimisation"
      description="Track min-spend, annual fees, and benefit expiries across your held cards. Coming soon."
      icon={<TrendingUp className="h-7 w-7" aria-hidden />}
    />
  );
}
