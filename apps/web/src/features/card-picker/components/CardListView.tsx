import { Filter } from 'lucide-react';
import type { Card } from '../types';
import { CardTile } from './CardTile';

interface CardListViewProps {
  readonly filteredCards: Card[];
  readonly visible: boolean;
  readonly contextCurrency: string | null;
  readonly onReset: () => void;
  readonly pinnedCardId?: number | null;
}

export function CardListView({
  filteredCards,
  visible,
  contextCurrency,
  onReset,
  pinnedCardId,
}: CardListViewProps) {
  return (
    <div
      className="pt-1 space-y-[10px] md:space-y-6"
      style={{ paddingBottom: 'calc(13rem + env(safe-area-inset-bottom))' }}
    >
      {filteredCards.length > 0 ? (
        filteredCards.map((card, index) => (
          <CardTile
            key={card.id}
            card={card}
            showTutorial={false}
            index={index}
            visible={visible}
            baseDelay={1200}
            contextCurrency={contextCurrency}
            isPinned={card.id === pinnedCardId}
          />
        ))
      ) : (
        <div className="text-center py-12">
          <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No cards found</h3>
          <p className="text-slate-500 text-xs mt-1 px-8">Try resetting the filters.</p>
          <button
            type="button"
            onClick={onReset}
            className="mt-4 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs font-bold hover:bg-slate-50"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
