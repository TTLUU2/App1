'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Info, RefreshCw, X } from 'lucide-react';
import type { Card } from '../types';
import { getColorForDestinationName, rateToRatio } from '../utils/cardUtils';
import { pushGtmEvent } from '../lib/gtm-stub';
import { PERK_OPTIONS } from '../data/filterOptions';

interface Props {
  card: Card;
  showTutorial: boolean;
  index: number;
  visible: boolean;
  baseDelay?: number;
  contextCurrency: string | null;
  isPinned?: boolean;
}

interface FlexiblePartner {
  name: string;
  ratio: number;
  color: string;
}

/** Infer program from card name when API didn't provide program (e.g. expand failed). */
function inferProgramFromCardName(name: string | undefined): string {
  const n = (name ?? '').toLowerCase();
  if (n.includes('qantas')) return 'Qantas';
  if (n.includes('velocity') || n.includes('virgin')) return 'Velocity';
  if (n.includes('nab ') || n.includes('nab rewards')) return 'NAB Rewards';
  if (n.includes('anz ') || n.includes('anz rewards') || n.includes('anz business'))
    return 'ANZ Rewards';
  if (n.includes('altitude') || n.includes('westpac')) return 'Altitude Rewards';
  if (n.includes('amplify') || n.includes('st.george') || n.includes('st george'))
    return 'Amplify Rewards';
  if (n.includes('amex') || n.includes('american express') || n.includes('membership rewards'))
    return 'American Express Membership Rewards';
  if (n.includes('mycard')) return 'MyCard';
  if (n.includes('star alliance')) return 'Star Alliance';
  return '';
}

/** Program name used for logo/color: rewards program or direct-earn FF program, whichever the card uses. */
function getDisplayProgram(card: Card): string {
  // Cards with an FF program should use that for branding (e.g. MyCard Velocity → Velocity)
  if (card.frequentFlyerProgram) {
    return card.frequentFlyerProgram;
  }
  const fromApi = (card.program && card.program !== 'Points' ? card.program : '') || '';
  return fromApi || inferProgramFromCardName(card.name);
}

function getCardBranding(card: Card) {
  let logoUrl = '';
  let programColor = '#333';
  let mobileLogoClass = 'h-[16px]';
  let desktopLogoClass = 'h-6';

  const program = getDisplayProgram(card);

  if (program === 'Velocity' || program === 'Velocity Frequent Flyer') {
    logoUrl = '/images/programs-large/velocity.png';
    programColor = '#512698';
  } else if (program === 'Qantas') {
    logoUrl = '/images/programs-large/qantas.png';
    programColor = '#DF0000';
    mobileLogoClass = 'h-[13px]';
    desktopLogoClass = 'h-[21px]';
  } else if (
    program === 'American Express Membership Rewards' ||
    program === 'Membership Rewards Ascent Premium'
  ) {
    logoUrl = '/images/programs-large/amex-mr.png';
    programColor = '#016FD0';
    mobileLogoClass = 'h-[13px]';
    desktopLogoClass = 'h-[15px]';
  } else if (program === 'Westpac Altitude Rewards' || program === 'Altitude Rewards') {
    logoUrl = '/images/programs-large/altitude.png';
    programColor = '#DF0000';
    mobileLogoClass = 'h-[13px]';
    desktopLogoClass = 'h-[17px]';
  } else if (program === 'NAB Rewards') {
    logoUrl = '/images/programs-large/nab-rewards.png';
    programColor = '#C20000';
  } else if (program === 'ANZ Rewards' || program === 'ANZ Business Rewards') {
    logoUrl = '/images/programs-large/anz-rewards.png';
    programColor = '#007DBA';
  } else if (program === 'Amplify Rewards') {
    logoUrl = '/images/programs-large/amplify.png';
    programColor = '#78BE20';
  } else if (program === 'MyCard' || program.startsWith('MyCard Rewards')) {
    logoUrl = '/images/programs-large/mycard.png';
    programColor = '#573232';
  } else if (program === 'Star Alliance') {
    logoUrl = '/images/programs-large/star-alliance.png';
    programColor = '#5B5C5E';
  }

  return { logoUrl, programColor, mobileLogoClass, desktopLogoClass, displayProgram: program };
}

/** Check if a card has a given perk by its filter id. */
function cardHasPerk(card: Card, perkId: string): boolean {
  if (perkId === 'lounge')
    return (
      !!card.extraInfo['Lounge Access'] &&
      card.extraInfo['Lounge Access'] !== 'No' &&
      card.extraInfo['Lounge Access'] !== 'None'
    );
  if (perkId === 'credit')
    return (
      card.specialFeatureTitle === 'Travel Credit' ||
      (!!card.extraInfo['Travel Credit'] && card.extraInfo['Travel Credit'] !== 'No')
    );
  if (perkId === 'insurance')
    return !!card.extraInfo['Insurance'] && card.extraInfo['Insurance'] !== 'No';
  if (perkId === 'no_intl_fees') return card.extraInfo['Intl Transaction Fee'] === 'No';
  return false;
}

/**
 * Get flexible transfer partners from PocketBase conversion rates.
 * PocketBase rate is a multiplier (e.g. 0.5 = 1 source → 0.5 dest), convert to divisor: ratio = 1 / rate.
 */
function getFlexiblePartners(card: Card): FlexiblePartner[] {
  // Auto-transfer cards earn bonus directly in FF currency — no transfer carousel needed
  if (card.frequentFlyerProgram && card.conversionRates?.length) return [];
  if (card.conversionRates?.length) {
    return card.conversionRates
      .filter((cr) => cr.rate > 0)
      .map((cr) => ({
        name: cr.name,
        ratio: rateToRatio(cr.rate),
        color: getColorForDestinationName(cr.name),
      }));
  }
  return [];
}

export function CardTile({
  card,
  index,
  visible,
  baseDelay = 0,
  contextCurrency,
  isPinned,
}: Props) {
  const { logoUrl, programColor, mobileLogoClass, desktopLogoClass, displayProgram } =
    getCardBranding(card);

  const flexibleProgramData = useMemo(
    () => getFlexiblePartners(card),
    [card.frequentFlyerProgram, card.name, card.conversionRates],
  );
  const isFlexibleProgram = flexibleProgramData.length > 0;
  const totalSlides = 1 + flexibleProgramData.length;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const [showEarnInfo, setShowEarnInfo] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const earnInfoBtnRef = useRef<HTMLButtonElement>(null);
  const [earnInfoPos, setEarnInfoPos] = useState<{ top: number; right: number } | null>(null);

  const toggleEarnInfo = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (showEarnInfo) {
        setShowEarnInfo(false);
      } else {
        const rect = earnInfoBtnRef.current?.getBoundingClientRect();
        if (rect) {
          setEarnInfoPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
        }
        setShowEarnInfo(true);
      }
    },
    [showEarnInfo],
  );

  useEffect(() => {
    if (!isFlexibleProgram) return;
    if (!contextCurrency) {
      setCurrentSlide(0);
      return;
    }
    const partnerIndex = flexibleProgramData.findIndex((p) => p.name === contextCurrency);
    setCurrentSlide(partnerIndex !== -1 ? partnerIndex + 1 : 0);
  }, [contextCurrency, isFlexibleProgram, flexibleProgramData]);

  useEffect(() => {
    if (!isFlexibleProgram || !visible) return;
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) return;
    const hasNudged =
      typeof window !== 'undefined' ? sessionStorage.getItem('flexible_swipe_hint_v4') : null;
    if (hasNudged) return;
    const timer = setTimeout(() => {
      setShowNudge(true);
      sessionStorage.setItem('flexible_swipe_hint_v4', 'true');
      setTimeout(() => setShowNudge(false), 2000);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isFlexibleProgram, visible]);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    const t = e.targetTouches[0];
    if (t) touchStartX.current = t.clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.targetTouches[0];
    if (t) touchEndX.current = t.clientX;
  };
  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1));
    if (distance < -50) setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };

  const currentPartner =
    isFlexibleProgram && currentSlide > 0 ? flexibleProgramData[currentSlide - 1] : null;

  /** Bonus points to show: never blank (prefer formatted total, else numeric, else "0"). */
  const displayBonusTotal =
    (card.bonusPointsTotal && String(card.bonusPointsTotal).trim()) ||
    (typeof card.bonusPoints === 'number' ? card.bonusPoints.toLocaleString() : '0');

  const effectiveEarnRate = useMemo(() => {
    const baseRate = card.earnRateNum || 0;
    const round2 = (n: number) => Math.round(n * 100) / 100;
    if (currentPartner) return String(round2(baseRate / currentPartner.ratio));
    if (card.earnToBonusRatio) return String(round2(baseRate / card.earnToBonusRatio));
    return String(round2(baseRate));
  }, [currentPartner, card.earnRateNum, card.earnToBonusRatio]);

  const year1PointsRaw = card.firstYearBonusPoints || card.bonusPoints;
  const year2PointsRaw = card.bonusPoints - year1PointsRaw;
  const hasSplitBonus = year2PointsRaw > 0;
  const currentRatio = currentPartner ? currentPartner.ratio : 1;
  const effectiveYear1Points = Math.floor(year1PointsRaw / currentRatio);
  const effectiveYear2Points = Math.floor(year2PointsRaw / currentRatio);
  const splitPointsStyle = currentPartner ? { color: currentPartner.color } : {};
  const delayTime = baseDelay + index * 100;

  return (
    <div
      className={`w-full flex flex-col items-center select-none relative will-change-transform${isPinned ? ' pt-2 md:pt-3' : ''}`}
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(100vh)',
        opacity: visible ? 1 : 0,
        transitionProperty: 'transform, opacity',
        transitionDuration: visible ? '2500ms, 600ms' : '4500ms, 800ms',
        transitionTimingFunction: visible
          ? 'cubic-bezier(0.2, 0.8, 0.2, 1), ease-out'
          : 'cubic-bezier(0.5, 0, 1, 1), ease-in',
        transitionDelay: visible ? `${delayTime}ms, ${delayTime}ms` : '0ms',
      }}
    >
      <div
        className="bg-white rounded-xl shadow-lg border border-gray-200/60 flex flex-col overflow-hidden w-full relative z-0"
        style={{ '--program-color': programColor } as React.CSSProperties}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-2 z-10"
          style={{ backgroundColor: programColor }}
        />

        <div className="ml-4 p-2 sm:p-4 border-b border-gray-200 pr-4">
          <div className="flex justify-between items-start md:hidden gap-2">
            {/* Mobile title: bumped from text-[11px] truncate to text-xs
                line-clamp-2 so long card names like "American Express
                Velocity Platinum Business Card" wrap instead of getting
                ellipsised mid-word. Prefer short_name when available. */}
            <h2 className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight flex-grow">
              {card.short_name || card.name}
            </h2>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${displayProgram || 'Program'} Logo`}
                className={mobileLogoClass + ' flex-shrink-0'}
              />
            ) : null}
          </div>
          <div className="hidden md:flex justify-between items-start">
            <div className="flex-grow pr-4">
              <h2 className="text-base font-bold text-gray-800 line-clamp-1">{card.short_name}</h2>
            </div>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${displayProgram || 'Program'} Logo`}
                className={desktopLogoClass + ' flex-shrink-0'}
              />
            ) : null}
          </div>
        </div>

        <div className="ml-4 flex flex-row flex-grow p-1.5 items-stretch">
          <div className="w-[34%] md:w-1/3 flex flex-col justify-start items-start pr-2 pt-2">
            <img
              src={card.imageUrl}
              alt={card.name}
              className="rounded-lg w-full mb-1 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://placehold.co/400x252/CCCCCC/FFFFFF?text=No+Image';
              }}
            />
            <div className="text-left mt-auto">
              <h3 className="font-semibold text-gray-700 mb-0 text-[9px] md:text-[10px]">
                Annual Fee
              </h3>
              <p className="text-gray-800 text-xs md:text-base font-bold leading-tight">
                {card.annualFee.includes('/') ? (
                  <>
                    {card.annualFee.split('/')[0]}
                    <span className="text-[9px] md:text-[11px] font-normal text-gray-500">
                      /{card.annualFee.split('/')[1]}
                    </span>
                  </>
                ) : (
                  card.annualFee
                )}
              </p>
              {card.feeNote && (
                <p className="text-[9px] text-gray-500 font-medium">{card.feeNote}</p>
              )}
            </div>
          </div>

          <div className="w-[66%] md:w-2/3 flex flex-col justify-between pl-2">
            <div className="flex flex-col h-full">
              <div className="flex flex-row justify-between pt-2">
                <div
                  className="w-1/2 flex flex-col items-center justify-start text-center pr-2 relative"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {isFlexibleProgram ? (
                    <div className="w-full relative group">
                      <button
                        type="button"
                        aria-label="Previous points partner"
                        className={`hidden md:flex absolute left-[-10px] top-1/2 -translate-y-1/2 z-10 p-1 transition-opacity ${currentSlide === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentSlide((prev) => Math.max(0, prev - 1));
                        }}
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next points partner"
                        className={`hidden md:flex absolute right-[-10px] top-1/2 -translate-y-1/2 z-10 p-1 transition-opacity ${currentSlide === totalSlides - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentSlide((prev) => Math.min(totalSlides - 1, prev + 1));
                        }}
                      >
                        <ChevronRight className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                      </button>
                      <div className="w-full overflow-hidden md:pt-1">
                        <div
                          className={`w-full md:animate-none ${showNudge && currentSlide === 0 ? 'animate-nudge' : ''}`}
                        >
                          <div
                            className="flex flex-row transition-transform duration-500 ease-in-out"
                            style={{
                              width: `${totalSlides * 100}%`,
                              transform: `translateX(-${currentSlide * (100 / totalSlides)}%)`,
                            }}
                          >
                            <div
                              className="flex-shrink-0 flex flex-col items-center justify-start"
                              style={{ width: `${100 / totalSlides}%` }}
                            >
                              <div className="px-2 py-0.5 inline-block">
                                <p className="text-[23px] sm:text-2xl font-bold leading-none tracking-tighter text-green-700">
                                  {displayBonusTotal}
                                </p>
                              </div>
                              <p className="text-[9px] sm:text-sm font-medium text-gray-800 leading-tight">
                                {card.bonusPointsUnit}
                              </p>
                            </div>
                            {flexibleProgramData.map((partner, idx) => (
                              <div
                                key={idx}
                                className="flex-shrink-0 flex flex-col items-center justify-start"
                                style={{ width: `${100 / totalSlides}%` }}
                              >
                                <p className="text-[7px] text-gray-400 font-semibold tracking-wider leading-none mb-0.5">
                                  Transferred
                                </p>
                                <div className="px-2 py-0.5 inline-block">
                                  <div className="relative w-fit mx-auto">
                                    <p
                                      className="text-lg sm:text-xl font-bold leading-none tracking-tighter"
                                      style={{ color: partner.color }}
                                    >
                                      {Math.floor(
                                        card.bonusPoints / partner.ratio,
                                      ).toLocaleString()}
                                    </p>
                                    <RefreshCw
                                      className="w-2.5 h-2.5 text-slate-700 absolute -top-0.5 -right-3"
                                      strokeWidth={3}
                                    />
                                  </div>
                                </div>
                                <p className="text-[9px] sm:text-sm font-medium text-gray-800 leading-tight">
                                  {partner.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center gap-1 mt-1">
                        {Array.from({ length: totalSlides }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-1 h-1 rounded-full transition-colors ${idx === currentSlide ? 'bg-slate-800' : 'bg-slate-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="px-2 py-0.5 inline-block">
                        <p className="text-[23px] sm:text-2xl font-bold leading-none tracking-tighter text-green-700">
                          {displayBonusTotal}
                        </p>
                      </div>
                      <p className="text-[9px] sm:text-sm font-medium text-gray-800 leading-tight">
                        {card.bonusPointsUnit}
                      </p>
                    </>
                  )}

                  {hasSplitBonus && (
                    <div className="flex gap-1 mt-1 text-center w-full max-w-[140px]">
                      <div className="flex-1 bg-slate-100 text-slate-700 rounded p-0.5 border border-slate-200">
                        <p className="text-[8.5px] font-medium leading-none mb-0.5">Year 1</p>
                        <div
                          className="font-bold text-[10px] leading-none flex justify-center items-center"
                          style={splitPointsStyle}
                        >
                          {currentPartner ? (
                            <div className="relative w-fit">
                              <span>{effectiveYear1Points.toLocaleString()}</span>
                              <RefreshCw
                                className="w-1.5 h-1.5 text-slate-700 absolute -top-0.5 -right-2"
                                strokeWidth={3}
                              />
                            </div>
                          ) : (
                            effectiveYear1Points.toLocaleString()
                          )}
                        </div>
                      </div>
                      <div className="flex-1 bg-slate-100 text-slate-700 rounded p-0.5 border border-slate-200">
                        <p className="text-[8.5px] font-medium leading-none mb-0.5">
                          {card.bonusSplitLabel2
                            ? card.bonusSplitLabel2.replace(/[\d,]+\s*/, '')
                            : 'Year 2'}
                        </p>
                        <div
                          className="font-bold text-[10px] leading-none flex justify-center items-center"
                          style={splitPointsStyle}
                        >
                          {currentPartner ? (
                            <div className="relative w-fit">
                              <span>{effectiveYear2Points.toLocaleString()}</span>
                              <RefreshCw
                                className="w-1.5 h-1.5 text-slate-700 absolute -top-0.5 -right-2"
                                strokeWidth={3}
                              />
                            </div>
                          ) : (
                            effectiveYear2Points.toLocaleString()
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-[9px] text-gray-500 mt-1 leading-tight line-clamp-2">
                    {card.spendCriteria}
                    {card.spendYearLabel && (
                      <sup className="text-[7px] text-red-500 font-bold ml-0.5">
                        {card.spendYearLabel}
                      </sup>
                    )}
                  </p>
                  {card.extraInfo['Annual Fee Credit'] && (
                    <p className="text-[9px] text-green-600 font-semibold mt-1">
                      +{card.extraInfo['Annual Fee Credit']} cash back
                    </p>
                  )}
                  {card.extraInfo['Bonus Perk'] && (
                    <p className="text-[9px] text-green-600 font-semibold mt-0.5">
                      + {card.extraInfo['Bonus Perk']}
                    </p>
                  )}
                </div>

                <div className="w-1/2 pl-2 -mt-1 md:mt-0">
                  <div className="mb-2">
                    <div className="mb-0 md:mb-1">
                      <h3 className="font-semibold text-gray-700 text-[7px] md:text-[9px] whitespace-nowrap inline leading-none">
                        Earn rate (per $1)
                      </h3>
                      {card.earnRate && (
                        <button
                          ref={earnInfoBtnRef}
                          type="button"
                          aria-label="Earn rate details"
                          onClick={toggleEarnInfo}
                          className="text-slate-400 hover:text-slate-600 transition-colors inline-flex align-middle ml-0.5"
                        >
                          <Info className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {showEarnInfo &&
                        card.earnRate &&
                        earnInfoPos &&
                        createPortal(
                          <>
                            <div
                              className="fixed inset-0 z-[99999]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowEarnInfo(false);
                              }}
                            />
                            <div
                              className="fixed w-40 md:w-52 bg-slate-800 text-white text-[10px] p-2.5 rounded-lg shadow-xl z-[100000] animate-in fade-in zoom-in-95 duration-200 cursor-auto"
                              style={{ top: earnInfoPos.top, right: earnInfoPos.right }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="absolute top-[-4px] right-4 w-2 h-2 bg-slate-800 rotate-45" />
                              <div
                                className="leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: card.earnRate }}
                              />
                            </div>
                          </>,
                          document.body,
                        )}
                    </div>
                    <div
                      className={`font-bold text-xs leading-tight ${!currentPartner && !card.earnToBonusRatio && !(card.frequentFlyerProgram && card.conversionRates?.length) ? 'text-gray-800' : ''}`}
                      style={
                        currentPartner
                          ? { color: currentPartner.color }
                          : card.earnToBonusRatio ||
                              (card.frequentFlyerProgram && card.conversionRates?.length)
                            ? { color: programColor }
                            : {}
                      }
                    >
                      {currentPartner ||
                      card.earnToBonusRatio ||
                      (card.frequentFlyerProgram && card.conversionRates?.length) ? (
                        <div className="relative w-fit inline-block">
                          <span>{effectiveEarnRate}</span>
                          <RefreshCw
                            className="w-2 h-2 text-slate-700 absolute -top-0.5 -right-2.5"
                            strokeWidth={3}
                          />
                        </div>
                      ) : (
                        <span>{effectiveEarnRate}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="grid grid-cols-2 gap-0.5 md:gap-1">
                      {PERK_OPTIONS.map((perk) => {
                        const has = cardHasPerk(card, perk.id);
                        return (
                          <div
                            key={perk.id}
                            className={`relative flex flex-col items-center justify-center rounded border p-0.5 h-7 md:h-10 ${
                              has ? 'bg-green-50 border-green-400' : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            {!has && (
                              <svg
                                className="absolute inset-0 w-full h-full p-1"
                                preserveAspectRatio="none"
                                viewBox="0 0 100 100"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <line
                                  x1="0"
                                  y1="0"
                                  x2="100"
                                  y2="100"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="text-slate-300"
                                />
                                <line
                                  x1="100"
                                  y1="0"
                                  x2="0"
                                  y2="100"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="text-slate-300"
                                />
                              </svg>
                            )}
                            <img
                              src={perk.icon}
                              alt={perk.name}
                              className={`w-2.5 h-2.5 md:w-3.5 md:h-3.5 mb-0 object-contain ${has ? '' : 'grayscale'}`}
                            />
                            <span
                              className={`text-[5.5px] md:text-[7px] font-semibold text-center leading-tight ${has ? 'text-green-700' : 'text-slate-500'}`}
                            >
                              {perk.name.replace(
                                'No International Transaction Fees',
                                'No Intl Fees',
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ml-4 px-3 pt-0 pb-1.5 grid grid-cols-2 gap-2 items-end">
          <button
            type="button"
            aria-expanded={isExploreOpen}
            aria-label={`Explore ${card.name} details`}
            onClick={() => setIsExploreOpen((prev) => !prev)}
            className="flex items-center justify-center py-0.5 text-[8px] font-semibold bg-transparent text-slate-700 transition whitespace-nowrap shadow-none outline-none focus:outline-none focus:shadow-none active:shadow-none"
          >
            Explore Card
            <ChevronDown
              className={`w-2.5 h-2.5 ml-0.5 transition-transform duration-200 ${isExploreOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <a
            href={card.applyLink || '#'}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Find out more about ${card.name}`}
            className="bg-red-600 text-white px-4 py-1.5 text-[10px] font-semibold rounded-md hover:bg-red-700 transition whitespace-nowrap shadow-sm text-center"
            onClick={() =>
              pushGtmEvent('card_matcher_click', {
                click_label: 'Find out more',
                card_name: card.name,
                card_provider: card.provider,
                card_program: card.program,
              })
            }
          >
            Find Out More
          </a>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${isExploreOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="ml-4 px-3 py-3 space-y-3 border-t border-slate-200">
            {card.benefitsHtml && (
              <div>
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Benefits
                </h4>
                <div
                  className="text-[11px] text-slate-800 leading-relaxed prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5 [&_li]:text-[11px] [&_p]:text-[11px] [&_p]:my-0.5"
                  dangerouslySetInnerHTML={{ __html: card.benefitsHtml }}
                />
              </div>
            )}
            {card.travelBenefitsHtml && (
              <div>
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Travel Benefits
                </h4>
                <div
                  className="text-[11px] text-slate-800 leading-relaxed prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5 [&_li]:text-[11px] [&_p]:text-[11px] [&_p]:my-0.5"
                  dangerouslySetInnerHTML={{ __html: card.travelBenefitsHtml }}
                />
              </div>
            )}
            {card.shortDescription && (
              <div>
                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Spend Criteria
                </h4>
                <div
                  className="text-[11px] text-slate-800 leading-relaxed prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5 [&_li]:text-[11px] [&_p]:text-[11px] [&_p]:my-0.5"
                  dangerouslySetInnerHTML={{ __html: card.shortDescription }}
                />
              </div>
            )}
            {!card.benefitsHtml && !card.travelBenefitsHtml && !card.shortDescription && (
              <p className="text-[11px] text-slate-400 italic">No additional details available.</p>
            )}
          </div>
        </div>
      </div>
      {isPinned && (
        <div className="absolute left-1/2 -translate-x-1/2 top-[5px] md:top-3 -translate-y-[50%] z-20">
          <span className="inline-block px-2 py-px text-[8px] md:px-3 md:py-0.5 md:text-[10px] font-bold text-emerald-700 bg-emerald-50 border md:border-2 border-emerald-500 rounded-full whitespace-nowrap">
            Last Viewed
          </span>
        </div>
      )}
    </div>
  );
}
