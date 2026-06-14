'use client';

import { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  ArrowUpDown,
  MousePointerClick,
  X,
} from 'lucide-react';
import { useCards } from './hooks/useCards';
import { useCardFilters } from './hooks/useCardFilters';
import { CardPickerPageSkeleton } from './components/LoadingSkeletons';
import { useCardInteraction } from './hooks/useCardInteraction';
import { pushGtmEvent, getElapsedTime } from './lib/gtm-stub';
import { ActiveCardSummary } from './components/ActiveCardSummary';
import { SORT_OPTIONS, CARD_TYPE_OPTIONS, FEE_FILTER_OPTIONS } from './data/filterOptions';
import type { FlyingItem, SortType } from './types';

const LazyFilterModal = lazy(() =>
  import('./components/FilterModal').then((m) => ({ default: m.FilterModal })),
);
const LazyCardListView = lazy(() =>
  import('./components/CardListView').then((m) => ({ default: m.CardListView })),
);

export function CardPicker() {
  const { cards, loading } = useCards();
  const filters = useCardFilters(cards);
  const {
    selectedPrograms,
    setSelectedPrograms,
    programFilterOptions,
    minBonusPoints,
    setMinBonusPoints,
    minEarnRate,
    setMinEarnRate,
    bonusType,
    setBonusType,
    selectedPerks,
    togglePerk,
    userIncome,
    setUserIncome,
    heldBanks,
    toggleHeldBank,
    selectedFee,
    setSelectedFee,
    selectedSort,
    setSelectedSort,
    selectedCardType,
    setSelectedCardType,
    filteredCards,
    getCardCountForOption,
    performResetValues,
  } = filters;

  const interaction = useCardInteraction(filteredCards, selectedSort);
  const {
    focusedCardId,
    setFocusedCardId,
    dragX,
    isDragging,
    isFlipped,
    setIsFlipped,
    hasInteracted,
    setHasInteracted,
    hasFlippedCard,
    setHasFlippedCard,
    showSwipeHint,
    showFlipHint,
    activeCard,
    onStackTouchStart,
    onStackTouchMove,
    onStackTouchEnd,
    onStackMouseDown,
    onStackWheel,
    handleStackScroll,
    getShortestOffset,
    getBackDetails,
  } = interaction;

  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [clickedOption, setClickedOption] = useState<string | number | null>(null);
  const [isRewinding, setIsRewinding] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [flyingItem, setFlyingItem] = useState<FlyingItem | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [lastAction, setLastAction] = useState<'forward' | 'rewind'>('forward');
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isCardsFalling, setIsCardsFalling] = useState(false);
  const [isListFalling, setIsListFalling] = useState(false);
  const [pinnedCardId, setPinnedCardId] = useState<number | null>(null);
  const [editingFilterStep, setEditingFilterStep] = useState<number | null>(null);
  const [completedFilterSteps, setCompletedFilterSteps] = useState<Set<number>>(new Set());
  const cardsFallingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listFallingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preListViewStateRef = useRef<{ currentStep: number; maxStepReached: number } | null>(null);

  const slotRef0 = useRef<HTMLDivElement>(null);
  const slotRef1 = useRef<HTMLDivElement>(null);
  const slotRef2 = useRef<HTMLDivElement>(null);
  const sortTargetRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Record<string | number, HTMLButtonElement | null>>({});
  const buttonTouchStartRef = useRef({ x: 0, y: 0 });
  const pageStartTimeRef = useRef(Date.now());
  const handleToggleViewRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePageHide = () => {
      const { minutes, seconds } = getElapsedTime(pageStartTimeRef.current);
      pushGtmEvent('card_matcher_time_on_page', { minutes, seconds });
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  useEffect(() => {
    return () => {
      if (cardsFallingTimerRef.current) clearTimeout(cardsFallingTimerRef.current);
      if (listFallingTimerRef.current) clearTimeout(listFallingTimerRef.current);
    };
  }, []);

  // Check if all 3 filters have been explicitly selected
  const allFiltersNarrowed =
    completedFilterSteps.has(0) && completedFilterSteps.has(1) && completedFilterSteps.has(2);

  // --- Label helpers ---
  const getProgramLabel = (): string => {
    if (selectedPrograms.has('All')) return 'All';
    if (selectedPrograms.size === 1) {
      const val = [...selectedPrograms][0] ?? '';
      return programFilterOptions.find((o) => o.value === val)?.label ?? val;
    }
    return `${selectedPrograms.size} Programs`;
  };
  const getProgramImg = (): string | null => {
    if (selectedPrograms.size === 1) {
      const val = [...selectedPrograms][0] ?? '';
      return programFilterOptions.find((o) => o.value === val)?.img ?? null;
    }
    return null;
  };
  const getCardTypeLabel = (): string => {
    if (selectedCardType.size === 1) {
      const val = [...selectedCardType][0] ?? '';
      return CARD_TYPE_OPTIONS.find((o) => o.value === val)?.label ?? val;
    }
    return 'Any';
  };
  const getCardTypeImg = (): string | null => {
    if (selectedCardType.size === 1) {
      const val = [...selectedCardType][0] ?? '';
      return CARD_TYPE_OPTIONS.find((o) => o.value === val)?.img ?? null;
    }
    return null;
  };
  const getFeeLabel = () => {
    const preset = FEE_FILTER_OPTIONS.find((o) => o.value === selectedFee);
    if (preset) return preset.label;
    return selectedFee >= 1000 ? 'Any' : `Max $${selectedFee}`;
  };

  const contextCurrency = (() => {
    if (selectedPrograms.size !== 1 || selectedPrograms.has('All')) return null;
    const v = [...selectedPrograms][0] ?? '';
    if (v === 'Velocity') return 'Velocity Points';
    if (v === 'Qantas') return 'Qantas Points';
    if (v === 'AMEX') return 'Amex Points';
    return v;
  })();

  // Reorder list view cards so the pinned card (from quick view) appears first
  const listViewCards = useMemo(() => {
    if (!pinnedCardId) return filteredCards;
    const pinned = filteredCards.find((c) => c.id === pinnedCardId);
    if (!pinned) return filteredCards;
    return [pinned, ...filteredCards.filter((c) => c.id !== pinnedCardId)];
  }, [filteredCards, pinnedCardId]);

  // --- Flow helpers ---
  const isStepFilled = (step: number) => {
    if (step === 1) return selectedCardType.size > 0;
    if (step === 2) return selectedFee < 2000;
    if (step === 3) return selectedSort !== null;
    return false;
  };

  const handleSelection = (
    option: { label: string; value: string | number; img?: string },
    event: React.MouseEvent,
    stepIndex: number,
  ) => {
    setLastAction('forward');
    setClickedOption(option.value);
    const startRect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    if (stepIndex < 4) {
      const targetRef = [slotRef0, slotRef1, slotRef2, sortTargetRef][stepIndex];
      if (targetRef?.current) {
        const endRect = targetRef.current.getBoundingClientRect();
        const flyData: FlyingItem = {
          label: option.label,
          img: option.img,
          startStyle: {
            top: startRect.top,
            left: startRect.left,
            width: startRect.width,
            height: startRect.height,
            position: 'fixed',
            zIndex: 9999,
            transition: 'none',
            backgroundColor: '#ffffff',
            borderWidth: '1px',
            borderColor: '#e2e8f0',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#374151',
            fontSize: '10px',
            fontWeight: '600',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          },
          endStyle: {
            top: endRect.top,
            left: endRect.left,
            width: endRect.width,
            height: endRect.height,
            position: 'fixed',
            zIndex: 9999,
            transition: 'all 1s cubic-bezier(0.22, 1, 0.36, 1)',
            borderRadius: '0.5rem',
            borderWidth: '1px',
            backgroundColor: '#ffffff',
            borderColor: '#d1d5db',
          },
          style: {},
        };
        if (stepIndex === 3) {
          flyData.endStyle.opacity = 0;
          flyData.endStyle.transform = 'scale(0.5)';
        }
        setFlyingItem({ ...flyData, style: flyData.startStyle });
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            setFlyingItem((prev) => (prev ? { ...prev, style: prev.endStyle } : null)),
          ),
        );
      }
    }

    setIsAnimating(true);
    pushGtmEvent('card_matcher_filter_applied', { filter_label: option.label });
    if (stepIndex === 0) setSelectedPrograms(new Set([String(option.value)]));
    if (stepIndex === 1) setSelectedCardType(new Set([String(option.value)]));
    if (stepIndex === 2) setSelectedFee(Number(option.value));
    if (stepIndex === 3) setSelectedSort(String(option.value) as SortType);
    if (stepIndex <= 2) setCompletedFilterSteps((prev) => new Set(prev).add(stepIndex));

    setTimeout(
      () => {
        setIsAnimating(false);
        setFlyingItem(null);
        setClickedOption(null);

        if (editingFilterStep !== null) {
          // Stay in list view — advance to next uncompleted filter or close wizard
          let nextStep: number | null = null;
          for (const s of [0, 1, 2]) {
            if (s === stepIndex) continue; // just completed this one
            if (!completedFilterSteps.has(s)) {
              nextStep = s;
              break;
            }
          }
          setEditingFilterStep(nextStep);
          return;
        }

        let nextStep = stepIndex === 3 ? 4 : stepIndex + 1;
        if (stepIndex !== 3) {
          while (nextStep < 4 && isStepFilled(nextStep)) nextStep++;
        }
        setMaxStepReached((prev) => Math.max(prev, nextStep));
        setCurrentStep(nextStep);
      },
      stepIndex === 3 ? 1000 : 800,
    );
  };

  const performReset = () => {
    performResetValues();
    setFocusedCardId(null);
    setIsFlipped(false);
    setHasInteracted(false);
    setCompletedFilterSteps(new Set());
  };

  const resetFlow = () => {
    setLastAction('rewind');
    performReset();
    if (currentStep === 5) {
      setEditingFilterStep(0);
      preListViewStateRef.current = { currentStep: 0, maxStepReached: 0 };
    } else {
      setCurrentStep(0);
      setMaxStepReached(0);
    }
  };

  const resetFilters = () => {
    performReset();
    if (currentStep === 5) {
      setEditingFilterStep(0);
      preListViewStateRef.current = { currentStep: 0, maxStepReached: 0 };
    } else {
      setCurrentStep(0);
      setMaxStepReached(0);
    }
  };

  const handleRewind = (targetStep: number) => {
    // If in list view, edit filter inline instead of navigating away
    if (currentStep === 5) {
      setEditingFilterStep((prev) => (prev === targetStep ? null : targetStep));
      return;
    }
    const sourceRef = [slotRef0, slotRef1, slotRef2][targetStep];
    if (!sourceRef?.current) {
      setCurrentStep(targetStep);
      return;
    }
    const startRect = sourceRef.current.getBoundingClientRect();

    let label = '',
      img: string | undefined | null = null,
      targetValue: string | number | null = null;
    if (targetStep === 0) {
      if (selectedPrograms.has('All')) {
        targetValue = 'All';
        label = 'All';
      } else if (selectedPrograms.size === 1) {
        targetValue = [...selectedPrograms][0] ?? 'All';
        label = getProgramLabel();
        img = getProgramImg();
      } else {
        targetValue = 'All';
        label = 'Multiple';
      }
    } else if (targetStep === 1) {
      if (selectedCardType.size === 1) {
        targetValue = [...selectedCardType][0] ?? 'Personal';
        label = getCardTypeLabel();
        img = getCardTypeImg();
      } else {
        targetValue = 'Personal';
        label = 'Any';
      }
    } else if (targetStep === 2) {
      targetValue = selectedFee;
      label = getFeeLabel();
    }

    setLastAction('rewind');
    setIsRewinding(true);
    setIsMeasuring(true);
    setCurrentStep(targetStep);
    setMaxStepReached((prev) => Math.max(prev, targetStep));

    setTimeout(() => {
      if (targetValue === null) {
        setIsMeasuring(false);
        setIsRewinding(false);
        return;
      }
      const targetEl = optionRefs.current[targetValue];
      if (targetEl) {
        const endRect = targetEl.getBoundingClientRect();
        setIsMeasuring(false);
        const flyData: FlyingItem = {
          label,
          img: img ?? undefined,
          startStyle: {
            top: startRect.top,
            left: startRect.left,
            width: startRect.width,
            height: startRect.height,
            position: 'fixed',
            zIndex: 9999,
            transition: 'none',
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderRadius: '0.5rem',
            borderWidth: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            fontWeight: '600',
            fontSize: '0.75rem',
            color: '#374151',
          },
          endStyle: {
            top: endRect.top,
            left: endRect.left,
            width: endRect.width,
            height: endRect.height,
            position: 'fixed',
            zIndex: 9999,
            transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
            backgroundColor: '#ffffff',
            borderColor: '#d1d5db',
          },
          style: {},
        };
        setFlyingItem({ ...flyData, style: flyData.startStyle });
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            setFlyingItem((prev) => (prev ? { ...prev, style: prev.endStyle } : null)),
          ),
        );
        setTimeout(() => {
          setFlyingItem(null);
          setIsRewinding(false);
        }, 600);
      } else {
        setIsMeasuring(false);
        setIsRewinding(false);
      }
    }, 50);
  };

  const handleToggleView = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    if (isCardsFalling || isListFalling) return; // Guard against rapid toggling
    if (currentStep < 5) {
      // Save the current state so we can restore when coming back to quick view
      preListViewStateRef.current = { currentStep, maxStepReached };
      // Pin the current active card to the top of list view only if the user interacted with quick view
      setPinnedCardId(hasInteracted ? (activeCard?.id ?? null) : null);
      // Preserve the current wizard step immediately so it's ready when currentStep changes to 5
      setEditingFilterStep(currentStep <= 3 ? currentStep : null);
      setIsCardsFalling(true);
      if (cardsFallingTimerRef.current) clearTimeout(cardsFallingTimerRef.current);
      cardsFallingTimerRef.current = setTimeout(() => {
        setCurrentStep(5);
        setMaxStepReached(5);
        setIsCardsFalling(false);
      }, 1200);
      pushGtmEvent('card_matcher_click', { click_label: 'Show list view' });
    } else {
      setIsListFalling(true);
      if (listFallingTimerRef.current) clearTimeout(listFallingTimerRef.current);
      listFallingTimerRef.current = setTimeout(() => {
        setEditingFilterStep(null);
        // Restore to the step the user was on before entering list view
        const restore = preListViewStateRef.current;
        if (restore) {
          setCurrentStep(restore.currentStep);
          setMaxStepReached(restore.maxStepReached);
          preListViewStateRef.current = null;
        } else {
          setCurrentStep(4);
        }
        setIsListFalling(false);
      }, 1000);
      pushGtmEvent('card_matcher_click', { click_label: 'Show quick view' });
      document.getElementById('root')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Keep ref current in case future code paths need it (kept for parity with upstream).
  handleToggleViewRef.current = handleToggleView;

  const onButtonTouchStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    buttonTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };
  const onButtonTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - buttonTouchStartRef.current.x;
    const dy = touch.clientY - buttonTouchStartRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) < 20) {
      e.preventDefault();
      handleToggleView(e);
    }
  };

  // --- Render step option buttons ---
  const stepEnterClass = isMeasuring
    ? 'opacity-0'
    : isAnimating
      ? 'animate-wheel-exit'
      : lastAction === 'rewind'
        ? 'animate-wheel-enter-reverse'
        : 'animate-wheel-enter';

  if (loading) return <CardPickerPageSkeleton />;

  return (
    <div className="font-sans text-slate-900 pb-20 overflow-x-hidden flex flex-col relative">
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        @keyframes wheelIn { 0% { transform: translateX(-100%) rotateY(-30deg); opacity: 0; } 100% { transform: translateX(0) rotateY(0deg); opacity: 1; } }
        @keyframes wheelOut { 0% { transform: translateX(0) rotateY(0deg); opacity: 1; } 100% { transform: translateX(100%) rotateY(30deg); opacity: 0; } }
        @keyframes wheelInReverse { 0% { transform: translateX(100%) rotateY(30deg); opacity: 0; } 100% { transform: translateX(0) rotateY(0deg); opacity: 1; } }
        @keyframes nudge { 0%, 100% { transform: translateX(0); } 30% { transform: translateX(-12px); } 50% { transform: translateX(0); } 70% { transform: translateX(-6px); } }
        .animate-nudge { animation: nudge 1.5s ease-in-out 1; }
        .animate-wheel-enter { transform-origin: center center; animation: wheelIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-wheel-enter-reverse { transform-origin: center center; animation: wheelInReverse 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-wheel-exit { transform-origin: center center; animation: wheelOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes bounceSlow { 0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); } 50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); } }
        .animate-bounce-slow { animation: bounceSlow 3s infinite; }
        @keyframes flipHint { 0% { transform: rotateY(0deg); } 40% { transform: rotateY(180deg); } 60% { transform: rotateY(180deg); } 100% { transform: rotateY(360deg); } }
        .animate-flip-hint { animation: flipHint 2s infinite ease-in-out; transform-style: preserve-3d; }
        @keyframes tapHint { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(0.8); opacity: 1; } }
        .animate-tap-hint { animation: tapHint 2s infinite ease-in-out; }
        @keyframes fadeInSlow { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in-slow { animation: fadeInSlow 2s ease-in-out forwards; }
      `}</style>

      {flyingItem && (
        <div
          className="bg-white rounded-xl border border-slate-200 shadow-md flex flex-row items-center justify-center font-bold text-slate-800 overflow-hidden pointer-events-none"
          style={flyingItem.style}
        >
          {flyingItem.img && (
            <img
              src={flyingItem.img}
              alt=""
              className="w-auto h-auto max-w-[16px] max-h-[16px] mr-1 object-contain"
            />
          )}
          <span className="text-[10px] truncate px-1">{flyingItem.label}</span>
        </div>
      )}

      {/* More Filters chip — floats at top-right of the CardPicker area
          (page-level header lives in /matching/page.tsx and provides the
          tab title + subtitle, replacing the previous empty header band
          this chip used to sit inside). Desktop keeps the viewport-fixed
          positioning so the chip stays anchored on wider layouts. */}
      <button
        onClick={() => setIsFilterModalOpen(true)}
        className="absolute right-0 top-0 md:fixed md:top-4 md:right-4 md:z-[200] z-20 flex items-center justify-center bg-white border border-slate-200 rounded-full h-7 px-2.5 md:h-8 md:px-3.5 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors shadow-sm"
        aria-label="Filters"
      >
        <span className="text-[10px] font-bold mr-1 md:mr-1.5 whitespace-nowrap">More Filters</span>
        <SlidersHorizontal className="w-3 h-3 md:w-3.5 md:h-3.5" />
      </button>

      {/* Selection slots */}
      <div className="overflow-hidden relative">
        <div className="max-w-md md:max-w-xl mx-auto px-0 py-2 md:py-1 grid grid-cols-3 text-center h-14 md:h-14 items-center">
          <div className="flex flex-col items-center justify-center h-full border-r border-slate-200 px-1">
            <div
              ref={slotRef0}
              className={`w-full h-10 md:h-12 relative ${currentStep === 5 ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (currentStep === 5) handleRewind(0);
              }}
            >
              {(currentStep === 5
                ? completedFilterSteps.has(0)
                : currentStep > 0 || !selectedPrograms.has('All')) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRewind(0);
                  }}
                  className={`w-full h-full bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center font-bold text-[10px] md:text-xs text-slate-800 overflow-hidden px-1 cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all active:scale-95 ${currentStep === 0 || (currentStep === 5 && editingFilterStep === 0 && isAnimating) ? 'opacity-0 pointer-events-none' : ''}`}
                >
                  {getProgramImg() && (
                    <img
                      src={getProgramImg()!}
                      className="w-3 h-3 md:w-4 md:h-4 mr-1 object-contain"
                      alt=""
                    />
                  )}
                  <span className="truncate">{getProgramLabel()}</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center h-full border-r border-slate-200 px-1">
            <div
              ref={slotRef1}
              className={`w-full h-10 md:h-12 relative ${currentStep === 5 ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (currentStep === 5) handleRewind(1);
              }}
            >
              {(currentStep === 5
                ? completedFilterSteps.has(1)
                : currentStep > 1 || (maxStepReached >= 1 && currentStep !== 1)) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRewind(1);
                  }}
                  className={`w-full h-full bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center font-bold text-[10px] md:text-xs text-slate-800 overflow-hidden px-1 cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all active:scale-95 ${currentStep === 1 || (currentStep === 5 && editingFilterStep === 1 && isAnimating) ? 'opacity-0 pointer-events-none' : ''}`}
                >
                  {getCardTypeImg() && (
                    <img
                      src={getCardTypeImg()!}
                      className="w-3 h-3 md:w-4 md:h-4 mr-1 object-contain"
                      alt=""
                    />
                  )}
                  <span className="truncate">{getCardTypeLabel()}</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center h-full px-1">
            <div
              ref={slotRef2}
              className={`w-full h-10 md:h-12 relative ${currentStep === 5 ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (currentStep === 5) handleRewind(2);
              }}
            >
              {(currentStep === 5
                ? completedFilterSteps.has(2)
                : (currentStep > 2 || maxStepReached >= 2) &&
                  (!isAnimating || currentStep !== 2)) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRewind(2);
                  }}
                  className={`w-full h-full bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-center font-bold text-[10px] md:text-xs text-slate-800 overflow-hidden px-1 cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all active:scale-95 ${currentStep === 2 || (currentStep === 5 && editingFilterStep === 2 && isAnimating) ? 'opacity-0 pointer-events-none' : ''}`}
                >
                  {getFeeLabel()}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-md md:max-w-xl mx-auto px-4 w-full relative z-50">
        {/* Step wizard */}
        <div
          className={`relative mt-0 mb-0 transition-all duration-700 ease-in-out ${currentStep === 5 && editingFilterStep === null ? 'min-h-0 h-0 opacity-0 overflow-hidden' : 'min-h-[110px] md:min-h-[120px] opacity-100'}`}
          style={{ perspective: '1000px' }}
        >
          <div
            className={`w-full transition-all duration-700 ease-in-out ${(currentStep >= 4 && currentStep < 5) || (currentStep === 5 && editingFilterStep === null) ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100 translate-y-0'}`}
          >
            <div className="w-full relative min-h-[110px] md:min-h-[120px]">
              {(currentStep === 0 || (currentStep === 5 && editingFilterStep === 0)) && (
                <div className={`w-full absolute top-0 left-0 ${stepEnterClass}`}>
                  <div className="text-center mb-4">
                    <label className="text-xs md:text-sm font-bold text-gray-500 tracking-wide">
                      What points do you want to earn?
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-2 md:gap-3">
                    {programFilterOptions.map((option, idx) => {
                      const count = getCardCountForOption(0, option.value);
                      const isDisabled = count === 0;
                      const isSelected = selectedPrograms.has(option.value);
                      const isHidden =
                        (isAnimating && isSelected && clickedOption !== option.value) ||
                        (isRewinding && isSelected);
                      return (
                        <button
                          key={option.value}
                          disabled={isDisabled}
                          ref={(el) => {
                            optionRefs.current[option.value] = el;
                          }}
                          onClick={(e) => handleSelection(option, e, 0)}
                          className={`py-3 md:py-3 px-1 md:px-2 rounded-lg text-[10px] md:text-xs font-semibold shadow-sm flex flex-row items-center justify-center border bg-white text-gray-700 border-gray-300 md:hover:bg-red-50 md:hover:text-red-700 md:hover:border-red-300 active:bg-red-50 active:text-red-700 active:border-red-300 ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${isHidden ? 'opacity-0' : 'opacity-100'}`}
                        >
                          {option.img && (
                            <img
                              src={option.img}
                              alt=""
                              className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-1.5 object-contain"
                            />
                          )}
                          <span className="truncate max-w-full">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(currentStep === 1 || (currentStep === 5 && editingFilterStep === 1)) && (
                <div className={`w-full absolute top-0 left-0 ${stepEnterClass}`}>
                  <div className="text-center mb-4">
                    <label className="text-xs md:text-sm font-bold text-gray-500 tracking-wide">
                      What type of card are you looking for?
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {CARD_TYPE_OPTIONS.map((option, idx) => {
                      const count = getCardCountForOption(1, option.value);
                      const isDisabled = count === 0;
                      const isSelected = selectedCardType.has(option.value);
                      const isHidden =
                        (isAnimating && isSelected && clickedOption !== option.value) ||
                        (isRewinding && isSelected);
                      return (
                        <button
                          key={option.value}
                          disabled={isDisabled}
                          ref={(el) => {
                            optionRefs.current[option.value] = el;
                          }}
                          onClick={(e) => handleSelection(option, e, 1)}
                          className={`py-3 md:py-3 px-1 md:px-2 rounded-lg text-xs md:text-sm font-semibold shadow-sm flex items-center justify-center border whitespace-nowrap bg-white text-gray-700 border-gray-300 md:hover:bg-red-50 md:hover:text-red-700 md:hover:border-red-300 active:bg-red-50 active:text-red-700 active:border-red-300 ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${isHidden ? 'opacity-0' : 'opacity-100'}`}
                        >
                          {option.img && (
                            <img
                              src={option.img}
                              alt=""
                              className="w-5 h-5 md:w-6 md:h-6 mr-2 object-contain"
                            />
                          )}
                          <span className="truncate">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(currentStep === 2 || (currentStep === 5 && editingFilterStep === 2)) && (
                <div className={`w-full absolute top-0 left-0 ${stepEnterClass}`}>
                  <div className="text-center mb-4">
                    <label className="text-xs md:text-sm font-bold text-gray-500 tracking-wide">
                      What are you willing to pay as an annual fee?
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-2 md:gap-3">
                    {FEE_FILTER_OPTIONS.map((option, idx) => {
                      const count = getCardCountForOption(2, option.value);
                      const isDisabled = count === 0;
                      const isSelected = selectedFee === option.value;
                      const isHidden =
                        (isAnimating && isSelected && clickedOption !== option.value) ||
                        (isRewinding && isSelected);
                      return (
                        <button
                          key={option.label}
                          disabled={isDisabled}
                          ref={(el) => {
                            optionRefs.current[option.value] = el;
                          }}
                          onClick={(e) => handleSelection(option, e, 2)}
                          className={`py-3 md:py-3 px-1 md:px-2 rounded-lg text-[10px] md:text-xs font-semibold shadow-sm flex items-center justify-center border whitespace-nowrap bg-white text-gray-700 border-gray-300 md:hover:bg-red-50 md:hover:text-red-700 md:hover:border-red-300 active:bg-red-50 active:text-red-700 active:border-red-300 ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''} ${isHidden ? 'opacity-0' : 'opacity-100'}`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(currentStep === 3 || (currentStep === 5 && editingFilterStep === 3)) && (
                <div className={`w-full absolute top-0 left-0 ${stepEnterClass}`}>
                  <div className="text-center mb-4">
                    <label className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wide">
                      Sort cards by
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6">
                    {SORT_OPTIONS.map((option, idx) => {
                      const isSelected = selectedSort === option.value;
                      const isHidden =
                        (isAnimating && isSelected && clickedOption !== option.value) ||
                        (isRewinding && isSelected);
                      return (
                        <button
                          key={option.value}
                          ref={(el) => {
                            optionRefs.current[option.value] = el;
                          }}
                          onClick={(e) => handleSelection(option, e, 3)}
                          className={`py-3 md:py-3 px-1 md:px-2 rounded-lg text-[10px] md:text-xs font-semibold shadow-sm flex items-center justify-center border whitespace-nowrap bg-white text-gray-700 border-gray-300 md:hover:bg-red-50 md:hover:text-red-700 md:hover:border-red-300 active:bg-red-50 active:text-red-700 active:border-red-300 ${isHidden ? 'opacity-0' : 'opacity-100'}`}
                        >
                          {option.img && (
                            <img
                              src={option.img}
                              alt=""
                              className="w-5 h-5 md:w-6 md:h-6 mr-2 object-contain"
                            />
                          )}
                          <span className="truncate">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 4 action buttons */}
          <div
            className={`absolute inset-0 flex items-center justify-center gap-3 md:gap-4 transition-all duration-700 ease-in-out delay-100 ${currentStep === 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}
          >
            <button
              onClick={() => handleToggleView()}
              className="flex items-center justify-center px-5 md:px-6 py-3 md:py-3.5 bg-white border border-slate-200 rounded-full shadow-md text-red-600 text-xs md:text-sm font-bold hover:bg-slate-50 transition-colors active:scale-95"
            >
              <ArrowDownWideNarrow className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Show list view
            </button>
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center justify-center px-5 md:px-6 py-3 md:py-3.5 bg-white border border-slate-200 rounded-full shadow-md text-red-600 text-xs md:text-sm font-bold hover:bg-slate-50 transition-colors active:scale-95"
            >
              <SlidersHorizontal className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              More Filters
            </button>
          </div>
        </div>

        {/* Sort bar */}
        <div className="w-full border-b border-slate-200 transition-all duration-700 relative z-40">
          <div
            ref={sortTargetRef}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-8 opacity-0 pointer-events-none"
          />
          <div className="relative h-14 w-full">
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 transition-opacity duration-500 pointer-events-none ${currentStep < 3 ? 'opacity-100' : 'opacity-0'}`}
            >
              <div className="animate-bounce-slow text-slate-400">
                <svg
                  width="20"
                  height="50"
                  viewBox="0 0 20 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 50V2" />
                  <path d="M3 9L10 2L17 9" />
                </svg>
              </div>
            </div>

            <div
              className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 transition-opacity duration-300 ${currentStep >= 4 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
              <button
                type="button"
                aria-label="Sort cards"
                aria-expanded={isSortMenuOpen}
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className="text-[10px] md:text-xs text-slate-600 hover:text-slate-800 font-bold flex items-center transition-all px-2 md:px-3 py-1.5 md:py-2 bg-white border border-slate-200 rounded-lg shadow-sm active:scale-95 whitespace-nowrap"
              >
                <ArrowUpDown className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5" />
                Sort
              </button>
              {isSortMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortMenuOpen(false)} />
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <div className="p-1">
                      <h4 className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        Sort Cards By
                      </h4>
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSelectedSort(option.value as SortType);
                            setPinnedCardId(null);
                            setIsSortMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center transition-colors rounded-md ${selectedSort === option.value ? 'bg-red-50 text-red-700' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          {option.img && (
                            <img src={option.img} className="w-4 h-4 mr-2 object-contain" alt="" />
                          )}
                          {option.label}
                          {selectedSort === option.value && (
                            <Check className="w-3 h-3 ml-auto text-red-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {currentStep >= 4 && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <p className="text-xs md:text-sm font-bold text-slate-500 whitespace-nowrap flex items-baseline">
                  Showing{' '}
                  <span className="text-slate-900 text-sm md:text-base font-black mx-1">
                    {filteredCards.length}
                  </span>{' '}
                  cards
                </p>
              </div>
            )}

            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
              <button
                onClick={resetFlow}
                className="text-[10px] md:text-xs text-red-600 hover:text-red-700 font-bold flex items-center px-2 md:px-3 py-1.5 md:py-2"
              >
                <RefreshCw className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Card stack */}
        <div
          className={`w-full flex justify-center transition-all duration-700 ease-in-out z-[1000] touch-pan-y overflow-visible ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${currentStep < 5 ? `opacity-100 max-h-[400px] md:max-h-[500px] mt-36 md:mt-44${isCardsFalling ? ' pointer-events-none' : ''}` : 'opacity-100 max-h-0 mt-0 pointer-events-none'}`}
          onTouchStart={onStackTouchStart}
          onTouchMove={onStackTouchMove}
          onTouchEnd={onStackTouchEnd}
          onMouseDown={onStackMouseDown}
          onWheel={onStackWheel}
        >
          <div
            className={`relative w-full max-w-[300px] h-[180px] transition-all ease-in-out will-change-transform overflow-visible md:scale-[1.15] ${currentStep < 5 && !isCardsFalling ? 'translate-y-0 opacity-100 duration-1000 delay-700' : 'translate-y-[1500px] opacity-0 duration-[4000ms]'}`}
          >
            <div className="absolute -top-[8.9rem] md:-top-[8.9rem] left-1/2 -translate-x-1/2 w-[300px] md:w-[500px] z-[9999] flex justify-center overflow-visible">
              <ActiveCardSummary
                activeCard={activeCard}
                visible={true}
                contextCurrency={contextCurrency}
              />
            </div>

            {/* Swipe hint */}
            {filteredCards.length > 1 && (
              <div
                className={`absolute -top-12 md:-top-[52px] left-0 right-0 z-20 flex justify-center items-center pointer-events-none transition-opacity duration-1000 ${showSwipeHint && !showFlipHint ? 'opacity-100' : 'opacity-0'}`}
              >
                <div className="relative flex justify-center items-center w-[320px] h-[60px]">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center absolute top-[15px] left-0 w-full z-10 pl-[3px]">
                    <span className="md:hidden">Swipe to explore</span>
                    <span className="hidden md:inline">Scroll to explore</span>
                  </p>
                  <svg
                    width="320"
                    height="60"
                    viewBox="0 0 320 60"
                    className="opacity-40 absolute top-0 left-0"
                  >
                    <defs>
                      <marker
                        id="arrowhead-l"
                        markerWidth="4"
                        markerHeight="4"
                        refX="0"
                        refY="2"
                        orient="auto"
                        markerUnits="strokeWidth"
                      >
                        <path d="M0,0 L4,2 L0,4" fill="#94a3b8" />
                      </marker>
                    </defs>
                    <path
                      d="M 90 18 Q 50 8 10 28"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      markerEnd="url(#arrowhead-l)"
                      transform="rotate(-8, 90, 18)"
                    />
                    <path
                      d="M 210 18 Q 250 8 290 28"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      markerEnd="url(#arrowhead-l)"
                      transform="rotate(8, 210, 18)"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Flip hint */}
            {filteredCards.length > 0 && showFlipHint && !showSwipeHint && !hasFlippedCard && (
              <div className="absolute -top-8 md:-top-[52px] left-0 right-0 z-20 flex justify-center items-center pointer-events-none animate-fade-in-slow">
                <div className="flex flex-col items-center justify-center translate-x-36 scale-[0.85]">
                  <div className="relative">
                    <div
                      className="w-10 h-6 bg-white rounded shadow-md animate-flip-hint backface-hidden"
                      style={{ perspective: '500px' }}
                    >
                      <img
                        src={activeCard?.imageUrl}
                        className="w-full h-full object-contain rounded"
                        alt=""
                      />
                    </div>
                    <div className="absolute top-1/2 -right-6 -translate-y-1/2 -mt-2 animate-tap-hint">
                      <MousePointerClick className="w-6 h-6 text-slate-400 scale-90" />
                    </div>
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 whitespace-nowrap">
                    Tap to see more
                  </p>
                </div>
              </div>
            )}

            {/* Apply button on active card */}
            {activeCard && currentStep === 4 && (
              <div className="absolute bottom-4 md:-bottom-8 left-0 right-0 z-[200] flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 pointer-events-auto">
                <a
                  href={activeCard.applyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Find out more about ${activeCard.short_name || activeCard.name}`}
                  className="bg-red-600 text-white text-xs font-bold px-8 py-3 rounded-full shadow-xl hover:bg-red-700 transition-all flex items-center ring-4 ring-white/60 hover:scale-105 active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    pushGtmEvent('card_matcher_click', {
                      click_label: 'Find out more',
                      card_name: activeCard.name,
                      card_provider: activeCard.provider,
                      card_program: activeCard.program,
                    });
                  }}
                >
                  Find Out More
                </a>
              </div>
            )}

            <div
              className={`absolute bottom-4 md:-bottom-12 left-0 right-0 text-center z-0 transition-opacity duration-300 ${currentStep < 4 ? 'opacity-100' : 'opacity-0'}`}
            >
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-baseline justify-center gap-1">
                Showing{' '}
                <span className="text-slate-600 text-2xl font-black">{filteredCards.length}</span>{' '}
                cards
              </p>
            </div>

            {filteredCards.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 z-10 bg-slate-50/50 backdrop-blur-[1px]">
                <Filter className="w-12 h-12 opacity-20 mb-2" />
                <span className="text-xs font-bold opacity-50">No cards match</span>
              </div>
            )}

            {/* Card stack items */}
            {filteredCards.map((card, index) => {
              const total = filteredCards.length;
              let focusedIndex = filteredCards.findIndex((c) => c.id === focusedCardId);
              if (focusedIndex === -1)
                focusedIndex = selectedSort ? 0 : Math.round((total - 1) / 2);

              const offset = getShortestOffset(index, focusedIndex, total);
              if (Math.abs(offset) > 3) return null;

              const spacing = 10;
              const cardWidth = 50;
              const dragOffset = isDragging ? dragX : 0;
              const r = offset * spacing + (dragOffset / cardWidth) * spacing;
              const isFalling = currentStep === 5 || isCardsFalling;
              const isWrapping = Math.abs(offset) > total / 2 - 0.5;
              let transitionStyle = 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
              if (isDragging) transitionStyle = 'none';
              else if (isFalling)
                transitionStyle =
                  'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease-out 0.5s';
              else if (isWrapping) transitionStyle = 'none';

              const dist = Math.abs(r);
              const liftAmount = -16 * Math.max(0, 1 - Math.pow(dist / spacing, 2));
              const zIndex = 100 - Math.round(dist);
              const isActive = !!(activeCard && card.id === activeCard.id);
              const isCardFlipped = isActive && isFlipped;
              const showBackFaceButton = !activeCard || currentStep !== 4;

              const backDetails = getBackDetails(card);

              return (
                <div
                  key={card.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setHasInteracted(true);
                    if (isActive) {
                      setIsFlipped(!isFlipped);
                      setHasFlippedCard(true);
                      if (focusedCardId !== card.id) setFocusedCardId(card.id);
                      pushGtmEvent('card_matcher_card_selected', {
                        card_name: card.name,
                        card_provider: card.provider,
                        card_program: card.program,
                      });
                    } else {
                      setFocusedCardId(card.id);
                      setIsFlipped(false);
                    }
                  }}
                  className="absolute top-1 md:top-1 left-0 right-0 mx-auto w-40 sm:w-56 origin-bottom will-change-transform cursor-pointer perspective-1000"
                  style={{
                    transformOrigin: '50% 290px',
                    transform: `rotate(${isFalling ? 0 : r}deg) translateY(${isFalling ? 0 : liftAmount}px) translateZ(0)`,
                    zIndex,
                    transition: transitionStyle,
                    opacity: isFalling ? 0 : 1,
                  }}
                >
                  <div
                    className={`relative w-full h-auto transition-transform duration-500 transform-style-3d ${isCardFlipped ? 'rotate-y-180' : ''}`}
                    style={{ aspectRatio: '1.58/1' }}
                  >
                    <div className="absolute inset-0 backface-hidden">
                      <img
                        src={card.imageUrl}
                        alt=""
                        width={320}
                        height={202}
                        fetchPriority={index === focusedIndex || isActive ? 'high' : 'low'}
                        className="w-full h-full object-contain drop-shadow-xl select-none"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://placehold.co/400x252/f1f5f9/94a3b8?text=Card';
                        }}
                      />
                    </div>
                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-800 text-white rounded-xl shadow-lg ring-1 ring-black/10 flex flex-col justify-center p-2 sm:p-4 select-none">
                      <div
                        className={`space-y-1 sm:space-y-3 ${showBackFaceButton ? 'mb-2 sm:mb-4' : ''}`}
                      >
                        {backDetails.map((detail, idx) => (
                          <div key={idx} className="flex justify-between items-center w-full">
                            <span className="text-[8px] sm:text-[10px] font-bold text-white truncate mr-2">
                              {detail.label}
                            </span>
                            {detail.hasFeature ? (
                              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                            ) : (
                              <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                      {showBackFaceButton && (
                        <a
                          href={card.applyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Find out more about ${card.short_name || card.name}`}
                          className="w-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white text-[9px] sm:text-[10px] font-bold py-1 sm:py-1.5 rounded-lg text-center transition-colors shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            pushGtmEvent('card_matcher_click', {
                              click_label: 'Find out more',
                              card_name: card.name,
                              card_provider: card.provider,
                              card_program: card.program,
                            });
                          }}
                        >
                          Find Out More
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Desktop chevron arrows */}
            {filteredCards.length > 1 && currentStep < 5 && !isCardsFalling && (
              <>
                <button
                  type="button"
                  aria-label="Previous card"
                  className="hidden md:flex absolute left-[-140px] top-1/2 -translate-y-1/2 z-[200] p-2 transition-opacity hover:opacity-60 active:scale-95"
                  onClick={() => handleStackScroll(-1)}
                >
                  <ChevronLeft className="w-9 h-9 text-black" />
                </button>
                <button
                  type="button"
                  aria-label="Next card"
                  className="hidden md:flex absolute right-[-140px] top-1/2 -translate-y-1/2 z-[200] p-2 transition-opacity hover:opacity-60 active:scale-95"
                  onClick={() => handleStackScroll(1)}
                >
                  <ChevronRight className="w-9 h-9 text-black" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Toggle view button below card stack */}
        <div
          className={`w-full flex justify-center z-40 transition-all ease-in-out will-change-transform ${currentStep < 5 && !isCardsFalling ? 'mt-3 md:mt-24 mb-2 translate-y-0 opacity-100 duration-1000 delay-700' : 'max-h-0 mt-0 mb-0 translate-y-[1500px] opacity-0 duration-[4000ms] pointer-events-none overflow-hidden'}`}
        >
          <button
            type="button"
            onClick={() => handleToggleView()}
            onTouchStart={onButtonTouchStart}
            onTouchEnd={onButtonTouchEnd}
            style={
              {
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties
            }
            className="text-[10px] md:text-[11.5px] text-red-600 hover:text-red-700 font-bold flex items-center transition-none px-4 md:px-5 py-2 md:py-2.5 bg-white rounded-full whitespace-nowrap shadow-md border border-slate-100 hover:bg-slate-50 ring-1 ring-slate-900/5 active:scale-95 transform-gpu cursor-pointer select-none"
          >
            <span className="relative z-10 flex items-center pointer-events-none">
              <ArrowDownWideNarrow className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5" />
              Show list view
            </span>
          </button>
        </div>
        {/* Toggle view button in list view */}
        {currentStep === 5 && !isListFalling && (
          <div
            className="fixed left-1/2 -translate-x-1/2 z-[100]"
            style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={() => handleToggleView()}
              onTouchStart={onButtonTouchStart}
              onTouchEnd={onButtonTouchEnd}
              style={
                {
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                } as React.CSSProperties
              }
              className="text-[10px] md:text-[11.5px] text-red-600 hover:text-red-700 font-bold flex items-center transition-all px-4 md:px-5 py-2 md:py-2.5 bg-white rounded-full whitespace-nowrap shadow-xl border border-slate-100 hover:bg-slate-50 ring-1 ring-slate-900/5 active:scale-95 transform-gpu cursor-pointer select-none"
            >
              <span className="relative z-10 flex items-center pointer-events-none">
                <ArrowUpWideNarrow className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5" />
                Show quick view
              </span>
            </button>
          </div>
        )}
        {/* List view (lazy loaded when user switches to list) */}
        <div
          className={`w-full transition-all ease-in-out duration-1000 ${currentStep === 5 && !isListFalling ? 'mt-1 translate-y-0 opacity-100' : 'translate-y-[100vh] opacity-0'}`}
        >
          <div className="w-full">
            {(currentStep === 5 || isListFalling) && (
              <Suspense
                fallback={
                  <div className="pb-20 space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                }
              >
                <LazyCardListView
                  filteredCards={listViewCards}
                  visible={currentStep === 5}
                  contextCurrency={contextCurrency}
                  onReset={resetFlow}
                  pinnedCardId={pinnedCardId}
                />
              </Suspense>
            )}
          </div>
        </div>
        {/* Toggle view button fixed at bottom in list view */}
        {currentStep === 5 && !isListFalling && (
          <div
            className="fixed left-1/2 -translate-x-1/2 z-[100]"
            style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={() => handleToggleView()}
              onTouchStart={onButtonTouchStart}
              onTouchEnd={onButtonTouchEnd}
              style={
                {
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                } as React.CSSProperties
              }
              className="text-[10px] md:text-[11.5px] text-red-600 hover:text-red-700 font-bold flex items-center transition-all px-4 md:px-5 py-2 md:py-2.5 bg-white rounded-full whitespace-nowrap shadow-xl border border-slate-100 hover:bg-slate-50 ring-1 ring-slate-900/5 active:scale-95 transform-gpu cursor-pointer select-none"
            >
              <span className="relative z-10 flex items-center pointer-events-none">
                <ArrowUpWideNarrow className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5" />
                Show quick view
              </span>
            </button>
          </div>
        )}
      </main>

      {isFilterModalOpen && (
        <Suspense
          fallback={
            <div
              className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center"
              aria-busy
            >
              <div className="bg-white rounded-xl px-6 py-4 text-slate-600 text-sm font-medium animate-pulse">
                Loading filters…
              </div>
            </div>
          }
        >
          <LazyFilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            allCards={cards}
            filteredCards={filteredCards}
            programFilterOptions={programFilterOptions}
            selectedSort={selectedSort}
            setSelectedSort={(s: SortType) => {
              setSelectedSort(s);
              setPinnedCardId(null);
            }}
            selectedCardType={selectedCardType}
            setSelectedCardType={setSelectedCardType}
            selectedPrograms={selectedPrograms}
            setSelectedPrograms={setSelectedPrograms}
            minBonusPoints={minBonusPoints}
            setMinBonusPoints={setMinBonusPoints}
            bonusType={bonusType}
            setBonusType={setBonusType}
            selectedFee={selectedFee}
            setSelectedFee={setSelectedFee}
            minEarnRate={minEarnRate}
            setMinEarnRate={setMinEarnRate}
            selectedPerks={selectedPerks}
            togglePerk={togglePerk}
            userIncome={userIncome}
            setUserIncome={setUserIncome}
            heldBanks={heldBanks}
            toggleHeldBank={toggleHeldBank}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            setMaxStepReached={setMaxStepReached}
            onReset={resetFilters}
            onShowCards={() => {
              setIsFilterModalOpen(false);
              if (currentStep !== 5) return;
              setIsCardsFalling(true);
              if (cardsFallingTimerRef.current) clearTimeout(cardsFallingTimerRef.current);
              cardsFallingTimerRef.current = setTimeout(() => {
                setCurrentStep(5);
                setMaxStepReached(5);
                setIsCardsFalling(false);
              }, 1200);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
