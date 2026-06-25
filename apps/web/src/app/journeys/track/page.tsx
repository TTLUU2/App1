'use client';

/**
 * /journeys/track — Track-a-journey wizard. Three steps:
 *
 *   Step 1 — Pick destination
 *     Inline SVG world map with city pins at each catalogue entry's
 *     geographic position. Tap a pin or a card below to select.
 *     Search input filters both.
 *   Step 2 — Set the target
 *     Pax (1/2/3/4+), Trip (Return/One-way), Cabin (E/PE/J/F), Redeem
 *     with (program list), Departure month (optional), Target points
 *     (preset chips, no manual input).
 *   Step 3 — Confirm
 *     Preview the goal + progress meter, then "Start tracking" →
 *     writes a TrackedJourney to the store and routes to /journeys.
 *
 * State stays in this component (single-flow). Map projection is
 * equirectangular over viewBox 0 0 360 180 — same coords as raw
 * (lng + 180, 90 - lat) so updating the catalogue's lat/lng moves
 * the pin without any other code change.
 *
 * Target-points chips are placeholder ranges keyed to typical AU
 * Business-class redemption costs — swap in your real bands when
 * you have them.
 */

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  Coins,
  Plane,
  PlaneTakeoff,
  Search,
  Target,
  Users,
} from 'lucide-react';
import { CityDetailModal } from '@/components/city-detail-modal';
import { Dropdown, type DropdownOption } from '@/components/dropdown';
import { JourneyProgress } from '@/components/journey-progress';
import { MonthYearPicker } from '@/components/month-year-picker';
import { WorldMap } from '@/components/world-map';
import { formatPoints } from '@/lib/format';
import { selectTotalPoints, useBalancesStore } from '@/store/balances';
import {
  DEFAULT_ORIGIN_ID,
  DESTINATION_CATALOGUE,
  ORIGIN_PORTS,
  REGIONS,
  useJourneysStore,
  type CabinClass,
  type DestinationOption,
  type OriginPort,
  type RegionId,
  type TripType,
} from '@/store/journeys';

const TRIP_TYPES: TripType[] = ['Return', 'One-way'];

const CABIN_OPTIONS: DropdownOption<CabinClass>[] = [
  { value: 'Economy', label: 'Economy', caption: 'Light cash, heavy on points value' },
  { value: 'Premium Economy', label: 'Premium Economy', caption: 'A step up, modest points lift' },
  { value: 'Business', label: 'Business', caption: 'Sweet spot — flat beds, lounge access' },
  { value: 'First', label: 'First', caption: 'Top of the cabin' },
];

const ORIGIN_OPTIONS: DropdownOption<string>[] = ORIGIN_PORTS.map((p) => ({
  value: p.id,
  label: p.city,
  caption: `${p.id.toUpperCase()} · ${p.state}`,
}));

/** Placeholder target-points bands, per-person. Anchored to typical
 *  AU Business-class redemption costs; swap in your real ranges. */
const TARGET_BANDS: Array<{ label: string; sub: string; points: number }> = [
  { label: '80k', sub: 'Asia · short', points: 80_000 },
  { label: '120k', sub: 'Asia · mid', points: 120_000 },
  { label: '150k', sub: 'Asia · J one-way', points: 150_000 },
  { label: '220k', sub: 'Europe/USA · J one-way', points: 220_000 },
  { label: '280k', sub: 'Europe · J return', points: 280_000 },
  { label: '360k', sub: 'USA · J return', points: 360_000 },
  { label: '500k+', sub: 'First class', points: 500_000 },
];

export default function TrackJourneyPage() {
  return (
    <Suspense fallback={<main className="px-4 pt-4 pb-32" aria-busy="true" />}>
      <TrackJourneyWizard />
    </Suspense>
  );
}

function TrackJourneyWizard() {
  const params = useSearchParams();
  const router = useRouter();
  const initialDestId = params.get('destinationId') ?? '';

  const programs = useBalancesStore((s) => s.programs);
  const total = useBalancesStore(selectTotalPoints);
  const startTracking = useJourneysStore((s) => s.startTracking);

  const [step, setStep] = useState<1 | 2 | 3>(initialDestId ? 2 : 1);
  const [originId, setOriginId] = useState<string>(DEFAULT_ORIGIN_ID);
  const [destId, setDestId] = useState(initialDestId);
  const dest = useMemo(() => DESTINATION_CATALOGUE.find((d) => d.id === destId) ?? null, [destId]);
  const origin = useMemo(
    () => ORIGIN_PORTS.find((o) => o.id === originId) ?? ORIGIN_PORTS[0]!,
    [originId],
  );

  const [pax, setPax] = useState<number>(2);
  const [tripType, setTripType] = useState<TripType>('Return');
  const [cabin, setCabin] = useState<CabinClass>('Business');
  const [programId, setProgramId] = useState(programs[0]?.id ?? '');
  const [departureMonth, setDepartureMonth] = useState('');
  const [targetBandPoints, setTargetBandPoints] = useState<number | null>(null);

  // Effective target = chosen band × pax. If no band picked yet, fall
  // back to the destination's catalogue Business-return cost so the
  // preview in Step 3 isn't empty.
  const effectiveTarget =
    targetBandPoints !== null ? targetBandPoints * pax : dest ? dest.pointsBusinessReturn * pax : 0;

  function handleStart() {
    if (!dest || effectiveTarget <= 0) return;
    startTracking({
      originId,
      destinationId: dest.id,
      destinationCity: dest.city,
      tripType,
      cabin,
      pax,
      targetPoints: effectiveTarget,
      departureMonth: departureMonth || null,
      programId,
    });
    router.push('/home?view=journeys');
  }

  return (
    <main className="px-4 pt-4 pb-32">
      <WizardHeader
        step={step}
        onBack={() => (step === 1 ? router.back() : setStep((step - 1) as 1 | 2 | 3))}
      />

      {step === 1 && (
        <Step1PickDestination
          selectedId={destId}
          originId={originId}
          origin={origin}
          onChangeOrigin={setOriginId}
          onPick={(id) => {
            setDestId(id);
            setStep(2);
          }}
        />
      )}

      {step === 2 && dest && (
        <Step2Configure
          dest={dest}
          origin={origin}
          pax={pax}
          tripType={tripType}
          cabin={cabin}
          programId={programId}
          departureMonth={departureMonth}
          targetBandPoints={targetBandPoints}
          programs={programs.map((p) => ({ id: p.id, name: p.name, balance: p.balance }))}
          onPax={setPax}
          onTripType={setTripType}
          onCabin={setCabin}
          onProgram={setProgramId}
          onDepartureMonth={setDepartureMonth}
          onTargetBand={setTargetBandPoints}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && dest && (
        <Step3Confirm
          dest={dest}
          origin={origin}
          pax={pax}
          tripType={tripType}
          cabin={cabin}
          programs={programs}
          programId={programId}
          totalPoints={total}
          targetPoints={effectiveTarget}
          departureMonth={departureMonth}
          onStart={handleStart}
        />
      )}
    </main>
  );
}

function WizardHeader({ step, onBack }: { step: 1 | 2 | 3; onBack: () => void }) {
  const labels: Record<1 | 2 | 3, string> = {
    1: 'Pick a destination',
    2: 'Set the target',
    3: 'You’re tracking',
  };
  return (
    <header className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          aria-label="Back"
        >
          {step === 1 ? <ChevronLeft className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          Back
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          Step {step} of 3
        </p>
      </div>
      <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Plane className="h-5 w-5 text-[var(--color-ph-red)]" aria-hidden />
        {labels[step]}
      </h1>
    </header>
  );
}

/* ─────────────────────────  STEP 1: PICK DESTINATION  ───────────────────────── */

function Step1PickDestination({
  selectedId,
  originId,
  origin,
  onChangeOrigin,
  onPick,
}: {
  selectedId: string;
  originId: string;
  origin: OriginPort;
  onChangeOrigin: (id: string) => void;
  onPick: (id: string) => void;
}) {
  const [region, setRegion] = useState<RegionId | null>(null);
  const [query, setQuery] = useState('');
  /** Pin/card tap opens the detail modal first — the modal's "Track
   *  to here" CTA is what actually advances the wizard. Lets the user
   *  browse cabin points before committing. */
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Pre-select the region of the currently-selected destination (e.g.
  // when arriving via /journeys/track?destinationId=…).
  if (region === null && selectedId) {
    const dest = DESTINATION_CATALOGUE.find((d) => d.id === selectedId);
    if (dest) {
      setRegion(dest.region);
      return null;
    }
  }

  if (region === null) {
    return (
      <>
        <OriginPickerStrip originId={originId} onChange={onChangeOrigin} />
        <RegionPicker onPick={(id) => setRegion(id)} />
      </>
    );
  }

  const regionDef = REGIONS.find((r) => r.id === region);
  const regional = DESTINATION_CATALOGUE.filter((d) => d.region === region);
  const matches = regional.filter((d) =>
    `${d.city} ${d.country}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const previewDest = previewId
    ? (DESTINATION_CATALOGUE.find((d) => d.id === previewId) ?? null)
    : null;

  return (
    <>
      <OriginPickerStrip originId={originId} onChange={onChangeOrigin} />

      <WorldMap
        destinations={regional}
        selectedId={previewId ?? selectedId}
        onPick={(id) => setPreviewId(id)}
        zoomBbox={regionDef?.bbox ?? null}
        title={regionDef?.label ?? 'World map'}
        onBack={() => setRegion(null)}
      />

      <label className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <Search className="h-4 w-4 text-zinc-400" aria-hidden />
        <input
          type="search"
          placeholder={`Search in ${regionDef?.label ?? 'this region'}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
      </label>

      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        In {regionDef?.label ?? 'this region'}
      </p>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {matches.map((d) => {
          const active = d.id === selectedId;
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setPreviewId(d.id)}
                className={
                  active
                    ? 'w-full rounded-xl bg-white p-3 text-left ring-2 ring-[var(--color-ph-red)] dark:bg-zinc-900'
                    : 'w-full rounded-xl bg-white p-3 text-left ring-1 ring-zinc-200 transition-colors hover:ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-800'
                }
              >
                <p className="text-sm font-semibold">{d.city}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{d.country}</p>
                <p className="mt-1 text-[11px] font-medium tabular-nums text-zinc-500">
                  ~{formatPoints(d.pointsBusinessReturn)} · Business
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <CityDetailModal
        destination={previewDest}
        origin={origin}
        onClose={() => setPreviewId(null)}
        onTrack={(id) => {
          setPreviewId(null);
          onPick(id);
        }}
      />
      {matches.length === 0 && (
        <p className="mt-4 text-center text-xs text-zinc-500">
          No matches — try another city or{' '}
          <button
            type="button"
            onClick={() => setRegion(null)}
            className="font-semibold text-[var(--color-ph-red)] hover:underline"
          >
            switch region
          </button>
          .
        </p>
      )}
    </>
  );
}

/** Phase 1 of Step 1: pick a region before drilling into cities.
 *  Each region card shows the world map zoomed into that region as a
 *  preview, so the user sees what they'd be picking from. */
/**
 * OriginPickerStrip — small "departing from {city}" row that sits at
 * the top of Step 1. Plane-takeoff icon + Dropdown of AU ports.
 * v1 restricts origins to Australia; international AU-bound users
 * are out of scope until the wizard learns to scale points by route.
 */
function OriginPickerStrip({
  originId,
  onChange,
}: {
  originId: string;
  onChange: (id: string) => void;
}) {
  return (
    <section
      aria-label="Departure port"
      className="mb-3 flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
    >
      <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-red-50 text-[var(--color-ph-red)] dark:bg-red-500/10">
        <PlaneTakeoff className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Flying from</p>
        <div className="mt-1">
          <Dropdown<string>
            value={originId}
            options={ORIGIN_OPTIONS}
            onChange={onChange}
            sheetTitle="Choose departure port"
          />
        </div>
      </div>
    </section>
  );
}

function RegionPicker({ onPick }: { onPick: (id: RegionId) => void }) {
  return (
    <>
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        Where in the world?
      </p>
      <p className="mt-1 text-xs text-zinc-500">Pick a region to zoom in.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {REGIONS.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onPick(r.id)}
              className="block w-full overflow-hidden rounded-xl bg-white text-left ring-1 ring-zinc-200 transition-colors hover:ring-[var(--color-ph-red)] dark:bg-zinc-900 dark:ring-zinc-800"
            >
              <div className="bg-slate-100/60 dark:bg-slate-800/40">
                <RegionPreview region={r} />
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold">{r.label}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{r.blurb}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Mini WorldMap preview already zoomed into the region — no pin
 *  interactivity, smaller height. Reuses the same component so the
 *  zoom math stays a single source of truth. */
function RegionPreview({
  region,
}: {
  region: { id: RegionId; bbox: { x: number; y: number; w: number; h: number } };
}) {
  const destinations = DESTINATION_CATALOGUE.filter((d) => d.region === region.id);
  return (
    <div className="pointer-events-none">
      <WorldMap
        destinations={destinations}
        selectedId=""
        onPick={() => {}}
        zoomBbox={region.bbox}
        title=""
      />
    </div>
  );
}

/* ─────────────────────────  STEP 2: CONFIGURE  ───────────────────────── */

function Step2Configure({
  dest,
  origin,
  pax,
  tripType,
  cabin,
  programId,
  departureMonth,
  targetBandPoints,
  programs,
  onPax,
  onTripType,
  onCabin,
  onProgram,
  onDepartureMonth,
  onTargetBand,
  onNext,
}: {
  dest: DestinationOption;
  origin: OriginPort;
  pax: number;
  tripType: TripType;
  cabin: CabinClass;
  programId: string;
  departureMonth: string;
  targetBandPoints: number | null;
  programs: Array<{ id: string; name: string; balance: number }>;
  onPax: (v: number) => void;
  onTripType: (v: TripType) => void;
  onCabin: (v: CabinClass) => void;
  onProgram: (v: string) => void;
  onDepartureMonth: (v: string) => void;
  onTargetBand: (v: number) => void;
  onNext: () => void;
}) {
  const canContinue = targetBandPoints !== null && programId !== '';
  const perPersonTarget = targetBandPoints ?? dest.pointsBusinessReturn;
  const totalTarget = perPersonTarget * pax;

  return (
    <>
      <section className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Route</p>
        <p className="mt-1 text-lg font-semibold">
          {origin.city}{' '}
          <span className="font-bold tabular-nums text-zinc-400">{origin.id.toUpperCase()}</span>
          {' → '}
          {dest.city}{' '}
          <span className="font-bold tabular-nums text-zinc-400">{dest.id.toUpperCase()}</span>
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-500">{dest.country}</p>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <FieldGroup label="Passengers" Icon={Users} flush>
          <PaxStepper value={pax} onChange={onPax} />
        </FieldGroup>
        <FieldGroup label="Cabin" Icon={Plane} flush>
          <Dropdown<CabinClass>
            value={cabin}
            options={CABIN_OPTIONS}
            onChange={onCabin}
            sheetTitle="Choose a cabin"
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Trip" Icon={ArrowLeftRight}>
        <SegmentedControl value={tripType} options={TRIP_TYPES} onChange={onTripType} />
      </FieldGroup>

      <FieldGroup label="Redeem with" Icon={Coins}>
        <ul className="space-y-1.5">
          {programs.map((p) => {
            const active = p.id === programId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onProgram(p.id)}
                  className={
                    active
                      ? 'flex w-full items-center justify-between rounded-xl bg-white p-3 ring-2 ring-[var(--color-ph-red)] dark:bg-zinc-900'
                      : 'flex w-full items-center justify-between rounded-xl bg-white p-3 ring-1 ring-zinc-200 hover:ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-800'
                  }
                >
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="text-xs font-medium tabular-nums text-zinc-500">
                    {formatPoints(p.balance)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </FieldGroup>

      <FieldGroup label="Departure month (optional)" Icon={Calendar}>
        <MonthYearPicker
          value={departureMonth}
          onChange={onDepartureMonth}
          placeholder="Pick a month"
        />
      </FieldGroup>

      <FieldGroup label="Target points (per person)" Icon={Target}>
        <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {TARGET_BANDS.map((band) => {
            const active = targetBandPoints === band.points;
            return (
              <li key={band.label}>
                <button
                  type="button"
                  onClick={() => onTargetBand(band.points)}
                  className={
                    active
                      ? 'w-full rounded-lg bg-[var(--color-ph-red)] p-2 text-center text-white shadow-sm'
                      : 'w-full rounded-lg bg-white p-2 text-center ring-1 ring-zinc-200 hover:ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-800'
                  }
                >
                  <p className={active ? 'text-sm font-bold' : 'text-sm font-bold'}>{band.label}</p>
                  <p
                    className={
                      active
                        ? 'mt-0.5 text-[10px] text-white/80'
                        : 'mt-0.5 text-[10px] text-zinc-500'
                    }
                  >
                    {band.sub}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
        {targetBandPoints !== null && pax > 1 && (
          <p className="mt-2 text-[11px] text-zinc-500">
            {formatPoints(perPersonTarget)} × {pax} pax ={' '}
            <span className="font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
              {formatPoints(totalTarget)} total
            </span>
          </p>
        )}
      </FieldGroup>

      <button
        type="button"
        onClick={onNext}
        disabled={!canContinue}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ph-red)] px-4 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </>
  );
}

/* ─────────────────────────  STEP 3: CONFIRM  ───────────────────────── */

function Step3Confirm({
  dest,
  origin,
  pax,
  tripType,
  cabin,
  programs,
  programId,
  totalPoints,
  targetPoints,
  departureMonth,
  onStart,
}: {
  dest: DestinationOption;
  origin: OriginPort;
  pax: number;
  tripType: TripType;
  cabin: CabinClass;
  programs: Array<{ id: string; name: string; balance: number }>;
  programId: string;
  totalPoints: number;
  targetPoints: number;
  departureMonth: string;
  onStart: () => void;
}) {
  const program = programs.find((p) => p.id === programId);
  const progress =
    targetPoints === 0 ? 0 : Math.min(100, Math.round((totalPoints / targetPoints) * 100));
  const gap = Math.max(0, targetPoints - totalPoints);
  const paxLabel = pax === 1 ? '1 passenger' : `${pax === 4 ? '4+' : pax} passengers`;

  return (
    <>
      <section className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Goal</p>
        <p className="mt-1 text-lg font-semibold">
          {dest.city} · {cabin}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {origin.id.toUpperCase()} → {dest.id.toUpperCase()} · {tripType} · {paxLabel}
          {departureMonth ? ` · ${departureMonth}` : ' · Flexible date'}
          {program ? ` · via ${program.name}` : ''}
        </p>

        <div className="mt-4 flex flex-col items-center">
          <JourneyProgress
            progress={targetPoints === 0 ? 0 : totalPoints / targetPoints}
            tripType={tripType}
            size={200}
          >
            <p className="text-3xl font-semibold tabular-nums">{progress}%</p>
            <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-zinc-500">
              {formatPoints(totalPoints)} / {formatPoints(targetPoints)}
            </p>
          </JourneyProgress>
          <p className="mt-3 text-[11px] font-semibold tabular-nums text-zinc-500">
            {gap === 0 ? "You're there — go book it." : `${formatPoints(gap)} to go`}
          </p>
        </div>
      </section>

      <ul className="mt-4 space-y-1.5 text-[11px] text-zinc-500">
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--color-ph-red)]" aria-hidden />
          We'll watch your balances and surface progress on Home.
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--color-ph-red)]" aria-hidden />
          You'll get a nudge when sweet-spot redemptions open up.
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--color-ph-red)]" aria-hidden />
          Stop tracking any time from Home → Journeys.
        </li>
      </ul>

      <button
        type="button"
        onClick={onStart}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ph-red)] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700"
      >
        Start tracking
      </button>

      <Link
        href="/home?view=journeys"
        className="mt-2 block text-center text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        Not now
      </Link>
    </>
  );
}

/* ─────────────────────────  SHARED CONTROLS  ───────────────────────── */

function FieldGroup({
  label,
  Icon,
  children,
  flush,
}: {
  label: string;
  Icon: typeof Users;
  children: React.ReactNode;
  /** Drop the top margin — for use inside a grid that already
   *  manages spacing (e.g. two-up Pax + Cabin row). */
  flush?: boolean;
}) {
  return (
    <div className={flush ? '' : 'mt-4'}>
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </p>
      {children}
    </div>
  );
}

function PaxStepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const dec = () => onChange(Math.max(1, value - 1));
  const inc = () => onChange(Math.min(9, value + 1));
  return (
    <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
      <StepperButton onClick={dec} disabled={value <= 1} ariaLabel="Decrease passengers">
        −
      </StepperButton>
      <span aria-live="polite" className="flex-1 text-center text-sm font-bold tabular-nums">
        {value}
      </span>
      <StepperButton onClick={inc} disabled={value >= 9} ariaLabel="Increase passengers">
        +
      </StepperButton>
    </div>
  );
}

function StepperButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="grid h-9 w-9 flex-none place-items-center rounded-lg text-base font-bold text-zinc-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}

function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  format,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={
              active
                ? 'rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm dark:bg-zinc-950'
                : 'rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }
          >
            {format ? format(opt) : String(opt)}
          </button>
        );
      })}
    </div>
  );
}
