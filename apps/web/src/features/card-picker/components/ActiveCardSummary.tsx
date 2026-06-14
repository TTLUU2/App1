'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, RefreshCw } from 'lucide-react';
import type { Card } from '../types';
import { rateToRatio } from '../utils/cardUtils';

interface Props {
  activeCard: Card | null;
  visible?: boolean;
  contextCurrency: string | null;
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

/** Resolve display program: rewards program or direct-earn FF program, with card-name inference fallback. */
function getDisplayProgram(card: Card): string {
  // Cards with an FF program should use that for branding (e.g. MyCard Velocity → Velocity)
  if (card.frequentFlyerProgram) {
    return card.frequentFlyerProgram;
  }
  const fromApi = (card.program && card.program !== 'Points' ? card.program : '') || '';
  return fromApi || inferProgramFromCardName(card.name);
}

function getLogoUrl(card: Card): string {
  const program = getDisplayProgram(card);
  if (program === 'Velocity' || program === 'Velocity Frequent Flyer')
    return 'https://pointhacks-spa-tools.fly.dev/images/programs-small/velocity.png';
  if (program === 'Qantas')
    return 'https://pointhacks-spa-tools.fly.dev/images/programs-small/qantas.png';
  if (
    program === 'American Express Membership Rewards' ||
    program === 'Membership Rewards Ascent Premium'
  )
    return 'https://pointhacks-spa-tools.fly.dev/images/programs-small/amex-mr.png';
  if (program === 'Westpac Altitude Rewards' || program === 'Altitude Rewards')
    return 'https://pointhacks-spa-tools.fly.dev/images/programs-small/altitude.png';
  if (program === 'NAB Rewards')
    return 'https://pointhacks-spa-tools.fly.dev/images/programs-small/nab-rewards.png';
  if (program === 'ANZ Rewards' || program === 'ANZ Business Rewards')
    return 'https://pointhacks-spa-tools.fly.dev/images/programs-small/anz-rewards.png';
  if (program === 'Amplify Rewards')
    return 'https://pointhacks-spa-tools.fly.dev/images/programs-small/amplify.png';
  if (program === 'MyCard' || program.startsWith('MyCard Rewards'))
    return 'https://pointhacks-spa-tools.fly.dev/images/programs-small/mycard.png';
  if (program === 'Star Alliance')
    return 'https://pointhacks-spa-tools.fly.dev/images/programs-small/star-alliance.png';
  return '';
}

interface ConvertedData {
  amount: string;
  unit: string;
  ratio: number;
}

/**
 * Get converted points data using PocketBase conversion rates.
 * PocketBase rate is a multiplier (e.g. 0.5 = 1 source → 0.5 dest), convert to divisor (1/rate).
 */
function getConvertedData(card: Card, contextCurrency: string | null): ConvertedData | null {
  if (!contextCurrency) return null;
  // Auto-transfer cards: bonus is already in FF currency, don't convert
  if (card.frequentFlyerProgram && card.conversionRates?.length) return null;

  const fromApi = card.conversionRates?.find(
    (cr) =>
      cr.name === contextCurrency ||
      cr.name.includes(contextCurrency) ||
      contextCurrency.includes(cr.name),
  );
  if (fromApi && fromApi.rate > 0) {
    const ratio = rateToRatio(fromApi.rate);
    return {
      amount: Math.floor(card.bonusPoints / ratio).toLocaleString(),
      unit: contextCurrency,
      ratio,
    };
  }

  return null;
}

export function ActiveCardSummary({ activeCard, visible = true, contextCurrency }: Props) {
  const [showBonusInfo, setShowBonusInfo] = useState(false);
  const bonusInfoBtnRef = useRef<HTMLButtonElement>(null);
  const [bonusInfoPos, setBonusInfoPos] = useState<{ top: number; left: number } | null>(null);

  const toggleBonusInfo = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (showBonusInfo) {
        setShowBonusInfo(false);
      } else {
        const rect = bonusInfoBtnRef.current?.getBoundingClientRect();
        if (rect) {
          setBonusInfoPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
        }
        setShowBonusInfo(true);
      }
    },
    [showBonusInfo],
  );

  const [showFeeInfo, setShowFeeInfo] = useState(false);
  const feeInfoBtnRef = useRef<HTMLButtonElement>(null);
  const [feeInfoPos, setFeeInfoPos] = useState<{ top: number; left: number } | null>(null);

  const toggleFeeInfo = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (showFeeInfo) {
        setShowFeeInfo(false);
      } else {
        const rect = feeInfoBtnRef.current?.getBoundingClientRect();
        if (rect) {
          setFeeInfoPos({ top: rect.bottom + 6, left: rect.left });
        }
        setShowFeeInfo(true);
      }
    },
    [showFeeInfo],
  );

  const [showEarnInfo, setShowEarnInfo] = useState(false);
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

  const convertedData = useMemo(
    () => (activeCard ? getConvertedData(activeCard, contextCurrency) : null),
    [activeCard, contextCurrency],
  );

  const effectiveEarnNum = useMemo(() => {
    if (!activeCard) return 0;
    const baseRate = activeCard.earnRateNum || 0;
    if (convertedData) return baseRate / convertedData.ratio;
    if (activeCard.earnToBonusRatio) return baseRate / activeCard.earnToBonusRatio;
    return baseRate;
  }, [activeCard, convertedData]);

  if (!activeCard) return <div className="mt-4 h-[75px] w-full transition-all duration-300" />;

  const logoUrl = getLogoUrl(activeCard);
  const displayPoints = convertedData ? convertedData.amount : activeCard.bonusPointsTotal;
  const displayUnit = convertedData ? convertedData.unit : activeCard.bonusPointsUnit;
  const isConverted = !!convertedData;
  const displayEarn = effectiveEarnNum.toLocaleString(undefined, { maximumFractionDigits: 4 });
  const showEarnConversionIcon =
    !!convertedData ||
    !!activeCard.earnToBonusRatio ||
    (activeCard.conversionRates?.length ?? 0) > 0;
  const year1PointsRaw = activeCard.firstYearBonusPoints || activeCard.bonusPoints;
  const year2PointsRaw = activeCard.bonusPoints - year1PointsRaw;
  const hasSplitBonus = year2PointsRaw > 0;

  return (
    <div
      className={`flex flex-col items-center justify-center pointer-events-none mt-4 transition-opacity duration-500 relative z-[200] ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center gap-2 mb-3 pb-0">
          {logoUrl && (
            <img src={logoUrl} className="h-5 w-5 object-contain" alt={activeCard.program} />
          )}
          <h2 className="text-sm md:text-base font-black text-slate-800 leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[260px] md:max-w-none shadow-sm">
            {activeCard.name}
          </h2>
        </div>

        <div className="flex justify-center items-start gap-0 text-xs font-bold text-slate-600">
          <div className="flex flex-col items-center leading-none w-[70px]">
            <div className="flex items-center gap-0.5 mb-1.5 pointer-events-auto">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">Fee</span>
              {activeCard.feeNote && (
                <button
                  ref={feeInfoBtnRef}
                  type="button"
                  aria-label="Annual fee details"
                  onClick={toggleFeeInfo}
                  className="text-slate-600 hover:text-slate-800 focus:outline-none transition-colors"
                >
                  <Info className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            {showFeeInfo &&
              feeInfoPos &&
              createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[99999]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFeeInfo(false);
                    }}
                  />
                  <div
                    className="fixed w-40 md:w-52 bg-slate-800 text-white text-[10px] p-2.5 rounded-lg shadow-xl z-[100000] animate-in fade-in zoom-in-95 duration-200 cursor-auto"
                    style={{ top: feeInfoPos.top, left: feeInfoPos.left }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="absolute top-[-4px] left-4 w-2 h-2 bg-slate-800 rotate-45" />
                    <div className="leading-relaxed space-y-1.5">
                      <div>
                        <span className="font-bold text-slate-300 block mb-0.5 text-[9px] uppercase tracking-wider">
                          Annual Fee
                        </span>
                        <p className="text-slate-100">{activeCard.annualFee}</p>
                      </div>
                      {activeCard.feeNote && (
                        <div className="pt-1.5 border-t border-slate-600/50">
                          <p className="text-slate-200">{activeCard.feeNote}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>,
                document.body,
              )}
            <span className="mt-1.5">{activeCard.annualFee}</span>
          </div>

          <div className="w-px h-8 bg-slate-300/50 mt-5 mx-1.5" />

          <div className="flex flex-col items-center leading-none min-w-[80px] relative">
            <div className="flex items-center justify-center gap-1 mb-1.5 pointer-events-auto">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">Bonus</span>
              <div className="relative flex items-center">
                <button
                  ref={bonusInfoBtnRef}
                  type="button"
                  aria-label="Bonus and spend criteria info"
                  onClick={toggleBonusInfo}
                  className="text-slate-600 hover:text-slate-800 focus:outline-none transition-colors"
                >
                  <Info className="w-2.5 h-2.5" />
                </button>
                {showBonusInfo &&
                  bonusInfoPos &&
                  createPortal(
                    <>
                      <div
                        className="fixed inset-0 z-[99999]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowBonusInfo(false);
                        }}
                      />
                      <div
                        className="fixed w-40 sm:w-52 bg-slate-800 text-white text-[10px] p-3 rounded-lg shadow-xl z-[100000] pointer-events-auto animate-in fade-in zoom-in-95 duration-200 cursor-auto text-left"
                        style={{
                          top: bonusInfoPos.top,
                          left: bonusInfoPos.left,
                          transform: 'translateY(-50%)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                        <div className="mb-2">
                          <span className="font-bold text-slate-300 block mb-0.5 text-[9px] uppercase tracking-wider">
                            Spend Criteria
                          </span>
                          <p className="leading-tight text-slate-100">
                            {activeCard.spendCriteria}
                            {activeCard.spendYearLabel && (
                              <sup className="text-[9px] text-red-500 font-bold ml-0.5">
                                {activeCard.spendYearLabel}
                              </sup>
                            )}
                          </p>
                        </div>
                        {hasSplitBonus ? (
                          <div className="pt-2 border-t border-slate-600/50">
                            <span className="font-bold text-slate-300 block mb-1 text-[9px] uppercase tracking-wider">
                              Breakdown
                            </span>
                            <div className="flex justify-between text-slate-200 mb-0.5">
                              <span>Year 1:</span>
                              <span className="font-bold">{year1PointsRaw.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-200">
                              <span>
                                {(activeCard.bonusSplitLabel2 || 'Year 2').replace(
                                  /^[\d,]+\s*/,
                                  '',
                                )}
                                :
                              </span>
                              <span className="font-bold">{year2PointsRaw.toLocaleString()}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-slate-600/50 flex justify-between text-slate-200">
                            <span>Year 1:</span>
                            <span className="font-bold">
                              {activeCard.bonusPoints.toLocaleString()} pts
                            </span>
                          </div>
                        )}
                      </div>
                    </>,
                    document.body,
                  )}
              </div>
            </div>
            {isConverted && (
              <span className="text-[7px] text-gray-400 font-semibold tracking-wider leading-none mb-0.5">
                Transferred
              </span>
            )}
            <div className="relative w-fit">
              <span className="text-emerald-700 text-base font-extrabold">{displayPoints}</span>
              {isConverted && (
                <RefreshCw
                  className="w-2 h-2 text-slate-700 absolute -top-0.5 -right-2"
                  strokeWidth={3}
                />
              )}
            </div>
            <span className="text-[9px] text-slate-500 font-medium mt-0.5">{displayUnit}</span>
          </div>

          <div className="w-px h-8 bg-slate-300/50 mt-5 mx-1.5" />

          <div className="flex flex-col items-center leading-none w-[70px]">
            <div className="flex items-center gap-0.5 mb-1.5 pointer-events-auto">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">Earn</span>
              {activeCard.earnRate && (
                <button
                  ref={earnInfoBtnRef}
                  type="button"
                  aria-label="Earn rate details"
                  onClick={toggleEarnInfo}
                  className="text-slate-600 hover:text-slate-800 focus:outline-none transition-colors"
                >
                  <Info className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            {showEarnInfo &&
              activeCard.earnRate &&
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
                      dangerouslySetInnerHTML={{ __html: activeCard.earnRate }}
                    />
                  </div>
                </>,
                document.body,
              )}
            <div className="relative w-fit mt-1.5 whitespace-nowrap">
              <span>{displayEarn} pts/$</span>
              {showEarnConversionIcon && (
                <RefreshCw
                  className="w-2 h-2 text-slate-700 absolute -top-0.5 -right-2"
                  strokeWidth={3}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
