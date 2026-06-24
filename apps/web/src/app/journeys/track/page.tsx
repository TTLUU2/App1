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
  Search,
  Target,
  Users,
} from 'lucide-react';
import { formatPoints } from '@/lib/format';
import { selectTotalPoints, useBalancesStore } from '@/store/balances';
import {
  DESTINATION_CATALOGUE,
  useJourneysStore,
  type CabinClass,
  type DestinationOption,
  type TripType,
} from '@/store/journeys';

const CABINS: CabinClass[] = ['Economy', 'Premium Economy', 'Business', 'First'];
const TRIP_TYPES: TripType[] = ['Return', 'One-way'];

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
  const [destId, setDestId] = useState(initialDestId);
  const dest = useMemo(() => DESTINATION_CATALOGUE.find((d) => d.id === destId) ?? null, [destId]);

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
      destinationId: dest.id,
      destinationCity: dest.city,
      tripType,
      cabin,
      pax,
      targetPoints: effectiveTarget,
      departureMonth: departureMonth || null,
      programId,
    });
    router.push('/journeys');
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
          onPick={(id) => {
            setDestId(id);
            setStep(2);
          }}
        />
      )}

      {step === 2 && dest && (
        <Step2Configure
          dest={dest}
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
  onPick,
}: {
  selectedId: string;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const matches = DESTINATION_CATALOGUE.filter((d) =>
    `${d.city} ${d.country}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <>
      <WorldMap destinations={DESTINATION_CATALOGUE} selectedId={selectedId} onPick={onPick} />

      <label className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <Search className="h-4 w-4 text-zinc-400" aria-hidden />
        <input
          type="search"
          placeholder="Or search a city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
      </label>

      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        Popular destinations
      </p>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {matches.map((d) => {
          const active = d.id === selectedId;
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onPick(d.id)}
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
      {matches.length === 0 && (
        <p className="mt-4 text-center text-xs text-zinc-500">No matches — try another city.</p>
      )}
    </>
  );
}

/**
 * Stylized world map — equirectangular projection (viewBox 360x180,
 * lng/lat directly map to x/y). Continents are rough rounded blobs;
 * we trade geographic accuracy for a clean, simple silhouette that
 * works at any width. City pins inherit their position from each
 * destination's lat/lng.
 */
function WorldMap({
  destinations,
  selectedId,
  onPick,
}: {
  destinations: DestinationOption[];
  selectedId: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Where to?</p>
      <svg
        viewBox="0 0 360 180"
        className="block w-full"
        role="img"
        aria-label="World map — tap a city to select"
      >
        {/* Continents — rough rounded blobs in equirectangular space.
            Geographic accuracy is intentionally low; the silhouette
            just frames the pins. */}
        <g className="fill-zinc-200 dark:fill-zinc-800">
          {/* North America */}
          <path d="M30,30 Q60,20 110,35 Q135,55 110,80 Q90,95 70,90 Q50,80 35,70 Q20,55 30,30 Z" />
          {/* South America */}
          <path d="M95,95 Q115,90 120,115 Q118,145 105,160 Q95,150 90,130 Q85,110 95,95 Z" />
          {/* Greenland */}
          <ellipse cx="155" cy="30" rx="14" ry="10" />
          {/* Europe */}
          <path d="M170,40 Q195,35 210,45 Q205,60 190,62 Q175,58 170,50 Z" />
          {/* Africa */}
          <path d="M180,75 Q205,68 215,90 Q215,120 200,135 Q185,130 178,110 Q172,90 180,75 Z" />
          {/* Asia */}
          <path d="M210,35 Q260,28 305,40 Q325,55 320,75 Q295,82 270,75 Q240,70 215,60 Q205,50 210,35 Z" />
          {/* Indian subcontinent */}
          <path d="M250,75 Q265,72 265,90 Q258,100 250,95 Q243,88 250,75 Z" />
          {/* SE Asia + Indonesia */}
          <path d="M278,90 Q298,88 305,100 Q295,110 282,105 Q275,98 278,90 Z" />
          {/* Australia */}
          <path d="M298,120 Q325,115 335,130 Q330,142 312,140 Q298,135 298,120 Z" />
          {/* NZ */}
          <ellipse cx="345" cy="142" rx="5" ry="4" />
          {/* Antarctica band */}
          <path d="M0,170 Q180,160 360,170 L360,180 L0,180 Z" />
        </g>

        {/* Equator line — soft hint */}
        <line
          x1="0"
          y1="90"
          x2="360"
          y2="90"
          className="stroke-zinc-300 dark:stroke-zinc-700"
          strokeWidth="0.2"
          strokeDasharray="2 2"
        />

        {/* City pins */}
        {destinations.map((d) => {
          const x = d.lng + 180;
          const y = 90 - d.lat;
          const active = d.id === selectedId;
          return (
            <g
              key={d.id}
              role="button"
              aria-label={`Select ${d.city}`}
              onClick={() => onPick(d.id)}
              className="cursor-pointer"
            >
              {/* Glow ring on active */}
              {active && (
                <circle cx={x} cy={y} r="6" className="fill-[var(--color-ph-red)] opacity-30" />
              )}
              <circle
                cx={x}
                cy={y}
                r={active ? 3 : 2.2}
                className="fill-[var(--color-ph-red)] stroke-white"
                strokeWidth="0.6"
              />
              {/* Label on active */}
              {active && (
                <text
                  x={x}
                  y={y - 6}
                  textAnchor="middle"
                  className="fill-zinc-900 dark:fill-zinc-100"
                  style={{ font: '600 5.5px system-ui, -apple-system, sans-serif' }}
                >
                  {d.city}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─────────────────────────  STEP 2: CONFIGURE  ───────────────────────── */

function Step2Configure({
  dest,
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
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Destination</p>
        <p className="mt-1 text-lg font-semibold">
          {dest.city} · {dest.country}
        </p>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <FieldGroup label="Passengers" Icon={Users} flush>
          <PaxStepper value={pax} onChange={onPax} />
        </FieldGroup>
        <FieldGroup label="Cabin" Icon={Plane} flush>
          <SelectControl value={cabin} options={CABINS} onChange={onCabin} />
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
        <input
          type="month"
          value={departureMonth}
          onChange={(e) => onDepartureMonth(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[var(--color-ph-red)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
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
          {tripType} · {paxLabel}
          {departureMonth ? ` · ${departureMonth}` : ' · Flexible date'}
          {program ? ` · via ${program.name}` : ''}
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="tabular-nums">{formatPoints(totalPoints)}</span>
            <span className="text-zinc-500 tabular-nums">{formatPoints(targetPoints)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-[var(--color-ph-red)] transition-[width] duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] font-semibold tabular-nums text-zinc-500">
            {gap === 0 ? "You're there — go book it." : `${formatPoints(gap)} to go (${progress}%)`}
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
          Stop tracking any time from the Journeys tab.
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
        href="/journeys"
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

function SelectControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-bold shadow-none focus:border-[var(--color-ph-red)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
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
