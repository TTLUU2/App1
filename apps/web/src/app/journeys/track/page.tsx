'use client';

/**
 * /journeys/track — Track-a-journey wizard. Three steps:
 *
 *   Step 1 — Pick destination (region → cities on the world map)
 *   Step 2 — Set the target (pax, cabin, trip, program, month)
 *   Step 3 — Confirm (goal preview, progress ring, Start tracking)
 *
 * Lacquer overlay applied in Phase 4 polish: paper background, brick
 * heros/accents, Instrument Serif titles, ph-red action pill, mono
 * eyebrows. Flow + state preserved verbatim — this pass only touches
 * chrome + typography.
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
import { MonthYearPicker, formatMonthYear } from '@/components/month-year-picker';
import { WorldMap } from '@/components/world-map';
import { HeroCard } from '@/components/lacquer';
import { formatPoints } from '@/lib/format';
import { selectTotalPoints, useBalancesStore } from '@/store/balances';
import {
  DEFAULT_ORIGIN_ID,
  DESTINATION_CATALOGUE,
  ORIGIN_PORTS,
  REGIONS,
  cabinKeyFor,
  pointsDeadlineForDeparture,
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

export default function TrackJourneyPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-ph-paper" aria-busy="true" />}>
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

  const perPersonTarget = dest ? dest.pointsByCabin[cabinKeyFor(cabin)] : 0;
  const effectiveTarget = perPersonTarget * pax;

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
    // Lands on Journeys tab; sub-tab defaults to destinations.
    router.push('/journeys');
  }

  return (
    <main className="min-h-dvh bg-ph-paper text-ph-text">
      <div className="px-6 pt-6 pb-32">
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
            perPersonTarget={perPersonTarget}
            totalTarget={effectiveTarget}
            programs={programs.map((p) => ({ id: p.id, name: p.name, balance: p.balance }))}
            onPax={setPax}
            onTripType={setTripType}
            onCabin={setCabin}
            onProgram={setProgramId}
            onDepartureMonth={setDepartureMonth}
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
      </div>
    </main>
  );
}

function WizardHeader({ step, onBack }: { step: 1 | 2 | 3; onBack: () => void }) {
  const labels: Record<1 | 2 | 3, string> = {
    1: 'Pick a destination',
    2: 'Set the target',
    3: "You're tracking",
  };
  return (
    <header className="mb-5">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-ph-text-muted hover:text-ph-text"
          aria-label="Back"
        >
          {step === 1 ? <ChevronLeft className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          Back
        </button>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ph-text-meta">
          Step {step} of 3
        </p>
      </div>
      <h1 className="font-serif text-[28px] leading-none text-ph-ink">{labels[step]}</h1>
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
  const [previewId, setPreviewId] = useState<string | null>(null);

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

      <label className="mt-4 flex items-center gap-2 rounded-ph-card border border-ph-border bg-ph-card px-3 py-2.5">
        <Search className="h-4 w-4 text-ph-text-meta" aria-hidden />
        <input
          type="search"
          placeholder={`Search in ${regionDef?.label ?? 'this region'}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-[13px] text-ph-ink placeholder:text-ph-text-meta focus:outline-none"
        />
      </label>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
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
                    ? 'w-full rounded-ph-card bg-ph-card p-3 text-left ring-2 ring-ph-brick'
                    : 'w-full rounded-ph-card border border-ph-border bg-ph-card p-3 text-left transition-colors hover:bg-ph-fill-warm'
                }
              >
                <p className="font-serif text-[17px] leading-tight text-ph-ink">{d.city}</p>
                <p className="mt-0.5 text-[11px] text-ph-text-muted">{d.country}</p>
                <p className="mt-1 text-[11px] font-medium tabular-nums text-ph-text-meta">
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
        <p className="mt-4 text-center text-[12px] text-ph-text-muted">
          No matches — try another city or{' '}
          <button
            type="button"
            onClick={() => setRegion(null)}
            className="font-semibold text-ph-brick hover:underline"
          >
            switch region
          </button>
          .
        </p>
      )}
    </>
  );
}

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
      className="mb-3 flex items-center gap-3 rounded-ph-card border border-ph-border bg-ph-card p-3"
    >
      <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ph-fill-warm text-ph-brick">
        <PlaneTakeoff className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
          Flying from
        </p>
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
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
        Where in the world?
      </p>
      <p className="mt-1 text-[13px] text-ph-text-muted">Pick a region to zoom in.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {REGIONS.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onPick(r.id)}
              className="block w-full overflow-hidden rounded-ph-card border border-ph-border bg-ph-card text-left transition-colors hover:border-ph-brick"
            >
              <div className="bg-ph-fill">
                <RegionPreview region={r} />
              </div>
              <div className="p-3">
                <p className="font-serif text-[17px] leading-tight text-ph-ink">{r.label}</p>
                <p className="mt-0.5 text-[11px] text-ph-text-muted">{r.blurb}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

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
  perPersonTarget,
  totalTarget,
  programs,
  onPax,
  onTripType,
  onCabin,
  onProgram,
  onDepartureMonth,
  onNext,
}: {
  dest: DestinationOption;
  origin: OriginPort;
  pax: number;
  tripType: TripType;
  cabin: CabinClass;
  programId: string;
  departureMonth: string;
  perPersonTarget: number;
  totalTarget: number;
  programs: Array<{ id: string; name: string; balance: number }>;
  onPax: (v: number) => void;
  onTripType: (v: TripType) => void;
  onCabin: (v: CabinClass) => void;
  onProgram: (v: string) => void;
  onDepartureMonth: (v: string) => void;
  onNext: () => void;
}) {
  const canContinue = programId !== '' && totalTarget > 0;
  const pointsDeadline = pointsDeadlineForDeparture(departureMonth || null);

  return (
    <>
      <section className="rounded-ph-card border border-ph-border bg-ph-card p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">Route</p>
        <p className="mt-1 font-serif text-[21px] leading-tight text-ph-ink">
          {origin.city}{' '}
          <span className="font-mono text-[12px] tabular-nums text-ph-text-meta">
            {origin.id.toUpperCase()}
          </span>
          {' → '}
          {dest.city}{' '}
          <span className="font-mono text-[12px] tabular-nums text-ph-text-meta">
            {dest.id.toUpperCase()}
          </span>
        </p>
        <p className="mt-0.5 text-[11px] text-ph-text-muted">{dest.country}</p>
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
        <WizardSegmented value={tripType} options={TRIP_TYPES} onChange={onTripType} />
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
                      ? 'flex w-full items-center justify-between rounded-ph-card bg-ph-card p-3 ring-2 ring-ph-brick'
                      : 'flex w-full items-center justify-between rounded-ph-card border border-ph-border bg-ph-card p-3 transition-colors hover:bg-ph-fill-warm'
                  }
                >
                  <span className="font-serif text-[17px] leading-tight text-ph-ink">{p.name}</span>
                  <span className="text-[12px] font-medium tabular-nums text-ph-text-meta">
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

      {/* Auto-computed target — tint panel so it reads as an informational
          panel, not a card the user picked. */}
      <section className="mt-4 rounded-ph-inner border border-ph-tint-border bg-ph-tint p-4">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-ph-brick" aria-hidden />
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-brick">Target</p>
        </div>
        <p className="mt-1 font-serif text-[27px] leading-none text-ph-ink tabular-nums">
          {formatPoints(totalTarget)}
        </p>
        <p className="mt-1 text-[11px] text-ph-text-muted tabular-nums">
          {formatPoints(perPersonTarget)} × {pax} pax · {cabin}
        </p>
        {pointsDeadline && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-ph-ink">
            <Calendar className="h-3 w-3 text-ph-brick" aria-hidden />
            Points needed by {formatMonthYear(pointsDeadline)}
            <span className="font-normal text-ph-text-muted">· 3-month buffer</span>
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={onNext}
        disabled={!canContinue}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
  const pointsDeadline = pointsDeadlineForDeparture(departureMonth || null);

  return (
    <>
      <HeroCard
        aria-labelledby="goal-heading"
        as="section"
        style={{ padding: 20, gap: 0, flexDirection: 'column', alignItems: 'stretch' }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ph-on-brick-meta">
          Goal
        </p>
        <p id="goal-heading" className="mt-1 font-serif text-[26px] leading-tight text-ph-on-brick">
          {dest.city} · {cabin}
        </p>
        <p className="mt-0.5 text-[12px] text-ph-on-brick-secondary">
          {origin.id.toUpperCase()} → {dest.id.toUpperCase()} · {tripType} · {paxLabel}
          {departureMonth ? ` · ${formatMonthYear(departureMonth)}` : ' · Flexible date'}
          {program ? ` · via ${program.name}` : ''}
        </p>
        {pointsDeadline && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-ph-on-brick-row">
            <Calendar className="h-3 w-3" aria-hidden />
            Points needed by {formatMonthYear(pointsDeadline)}
          </p>
        )}

        <div className="mt-5 flex flex-col items-center">
          {/* Paper disc backdrop for the JourneyProgress ring — the
              globe illustration is teal on a light sphere; against the
              brick it lost contrast, so we frame it in a paper circle.
              The disc size hugs the ring at 200px so the brick still
              wraps around it. */}
          <div
            className="grid place-items-center rounded-full bg-ph-card"
            style={{ width: 216, height: 216, boxShadow: '0 1px 3px rgba(46,10,8,0.12)' }}
          >
            <JourneyProgress
              progress={targetPoints === 0 ? 0 : totalPoints / targetPoints}
              tripType={tripType}
              size={200}
            >
              <p className="font-serif text-[42px] leading-none text-ph-ink tabular-nums">
                {progress}%
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-ph-text-muted tabular-nums">
                {formatPoints(totalPoints)} / {formatPoints(targetPoints)}
              </p>
            </JourneyProgress>
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-on-brick-secondary tabular-nums">
            {gap === 0 ? "You're there — go book it." : `${formatPoints(gap)} to go`}
          </p>
        </div>
      </HeroCard>

      <ul className="mt-5 space-y-2 text-[12px] text-ph-text-muted">
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-ph-pine" aria-hidden />
          We&apos;ll watch your balances and surface progress on Journeys.
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-ph-pine" aria-hidden />
          You&apos;ll get a nudge when sweet-spot redemptions open up.
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-ph-pine" aria-hidden />
          Stop tracking any time from Journeys.
        </li>
      </ul>

      <button
        type="button"
        onClick={onStart}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ph-red px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Start tracking
      </button>

      <Link
        href="/journeys"
        className="mt-3 block text-center text-[12px] font-medium text-ph-text-muted hover:text-ph-text"
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
  flush?: boolean;
}) {
  return (
    <div className={flush ? '' : 'mt-4'}>
      <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ph-text-meta">
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
    <div className="flex items-center rounded-ph-card border border-ph-border bg-ph-card">
      <StepperButton onClick={dec} disabled={value <= 1} ariaLabel="Decrease passengers">
        −
      </StepperButton>
      <span
        aria-live="polite"
        className="flex-1 text-center font-serif text-[19px] leading-none text-ph-ink tabular-nums"
      >
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
      className="grid h-10 w-10 flex-none place-items-center rounded-full text-[19px] font-medium text-ph-text-muted transition-colors hover:bg-ph-fill-warm hover:text-ph-brick disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Local segmented control for Return/One-way. Kept separate from the
 *  Lacquer SegmentedControl primitive because that one expects a
 *  {id,label}[] item shape; this wizard uses primitive arrays like
 *  readonly TripType[]. */
function WizardSegmented<T extends string | number>({
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
    <div className="grid auto-cols-fr grid-flow-col rounded-full bg-ph-fill p-1">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={
              active
                ? 'rounded-full bg-ph-card px-3 py-1.5 text-[13px] font-medium text-ph-ink'
                : 'rounded-full px-3 py-1.5 text-[13px] font-medium text-ph-text-muted hover:text-ph-text'
            }
            style={active ? { boxShadow: 'var(--shadow-ph-thumb)' } : undefined}
          >
            {format ? format(opt) : String(opt)}
          </button>
        );
      })}
    </div>
  );
}
