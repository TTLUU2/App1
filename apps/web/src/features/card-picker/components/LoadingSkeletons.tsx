/**
 * Loading skeleton used while the Card Picker boots. Tailwind-only, no
 * external dep. Lifted from the upstream spa-tools repo; only the Card
 * Picker variant is needed here.
 */

export function CardPickerPageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" aria-hidden aria-busy="true">
      {/* Header */}
      <div className="bg-slate-50 pt-4 pb-2 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto relative flex items-center justify-center px-4">
          <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 h-7 w-16 bg-slate-200 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Slot pills */}
      <div className="bg-slate-50 overflow-hidden">
        <div className="max-w-md mx-auto px-4 py-2 grid grid-cols-3 gap-2 h-14 items-center">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Step / options area */}
      <main className="max-w-md mx-auto px-4 w-full flex-1 pt-4">
        <div className="mb-4">
          <div className="h-3 w-32 bg-slate-200 rounded animate-pulse mb-4 mx-auto" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>

        {/* Central card stack area */}
        <div className="flex justify-center mt-24 md:mt-28">
          <div className="w-full max-w-[300px] h-[180px] flex items-center justify-center">
            <div className="w-[260px] h-[160px] bg-slate-200 rounded-2xl animate-pulse shadow-lg" />
          </div>
        </div>

        {/* Bottom text */}
        <div className="flex justify-center mt-6">
          <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
        </div>
      </main>

      {/* Sort bar */}
      <div className="w-full border-t border-slate-200 bg-slate-50 mt-auto">
        <div className="max-w-md mx-auto h-14 flex items-center justify-center gap-2 px-4">
          <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
