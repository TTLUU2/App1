import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  onClear?: () => void;
}

export function EmptyState({ onClear }: EmptyStateProps) {
  return (
    <div className="rounded-card border border-dashed border-line bg-paper-warm/50 p-10 text-center">
      <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-paper text-xl ring-1 ring-line">
        <SearchX size={20} strokeWidth={1.75} className="text-ink-mute" aria-hidden />
      </div>
      <h3 className="font-serif text-xl text-ink">No deals match these filters</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
        Try widening the expiry window or unselecting a program — most weeks have at least one offer
        per category.
      </p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-full bg-navy px-4 py-1.5 text-sm font-medium text-paper hover:bg-navy-deep"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
