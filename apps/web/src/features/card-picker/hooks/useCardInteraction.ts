'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { Card } from '../types';

/** Synthesise a paper-slide sound via the Web Audio API. */
let audioCtx: AudioContext | null = null;
function playCardFlick() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;
    const now = ctx.currentTime;

    // Pink-ish noise for paper texture
    const bufferLen = Math.round(ctx.sampleRate * 0.07); // 70 ms
    const buffer = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0;
    for (let i = 0; i < bufferLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      data[i] = (b0 + b1 + b2 + white * 0.3104856) * 0.15;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // High-pass filter that sweeps up — paper sliding away
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(3500, now + 0.05);
    filter.Q.value = 0.5;

    // Volume envelope: gentle swell then fade
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.07);
  } catch {
    // Silently ignore — audio not critical
  }
}

export interface CardInteractionState {
  focusedCardId: number | null;
  setFocusedCardId: (id: number | null) => void;
  dragX: number;
  isDragging: boolean;
  isFlipped: boolean;
  setIsFlipped: (v: boolean) => void;
  hasInteracted: boolean;
  setHasInteracted: (v: boolean) => void;
  hasFlippedCard: boolean;
  setHasFlippedCard: (v: boolean) => void;
  showSwipeHint: boolean;
  showFlipHint: boolean;
  activeCard: Card | null;
  onStackTouchStart: (e: React.TouchEvent) => void;
  onStackTouchMove: (e: React.TouchEvent) => void;
  onStackTouchEnd: () => void;
  onStackMouseDown: (e: React.MouseEvent) => void;
  onStackWheel: (e: React.WheelEvent) => void;
  handleStackScroll: (delta: number) => void;
  getShortestOffset: (index: number, focusedIndex: number, total: number) => number;
  getBackDetails: (card: Card) => Array<{ label: string; hasFeature: boolean }>;
}

export function useCardInteraction(
  filteredCards: Card[],
  selectedSort: string,
): CardInteractionState {
  const [focusedCardId, setFocusedCardId] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasFlippedCard, setHasFlippedCard] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [showFlipHint, setShowFlipHint] = useState(false);

  const dragStartX = useRef<number | null>(null);
  const dragDiffRef = useRef(0);
  const dragIndexRef = useRef(0);
  const handleStackScrollRef = useRef<(delta: number) => void>(() => {});

  useEffect(() => {
    setFocusedCardId(null);
  }, [selectedSort]);

  // Arrow key navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStackScrollRef.current(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStackScrollRef.current(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const hasShown = sessionStorage.getItem('swipe_hint_shown_v2');
    if (hasShown) return;

    const showSwipeTimer = setTimeout(() => setShowSwipeHint(true), 500);
    const hideSwipeTimer = setTimeout(() => setShowSwipeHint(false), 3500);
    const showFlipTimer = setTimeout(() => {
      setShowFlipHint(true);
      sessionStorage.setItem('swipe_hint_shown_v2', 'true');
    }, 4500);

    return () => {
      clearTimeout(showSwipeTimer);
      clearTimeout(hideSwipeTimer);
      clearTimeout(showFlipTimer);
    };
  }, []);

  const activeCard = useMemo<Card | null>(() => {
    if (filteredCards.length === 0) return null;
    if (focusedCardId) {
      const found = filteredCards.find((c) => c.id === focusedCardId);
      if (found) return found;
    }
    const centerIndex = selectedSort ? 0 : Math.round((filteredCards.length - 1) / 2);
    return filteredCards[centerIndex] ?? null;
  }, [filteredCards, focusedCardId, selectedSort]);

  const handleStackScroll = (delta: number) => {
    if (filteredCards.length === 0) return;
    setHasInteracted(true);
    const total = filteredCards.length;
    // Determine current index from focusedCardId (or default center/first card)
    let currentIndex = focusedCardId ? filteredCards.findIndex((c) => c.id === focusedCardId) : -1;
    if (currentIndex === -1) currentIndex = selectedSort ? 0 : Math.round((total - 1) / 2);
    const newIndex = (currentIndex + delta + total) % total;
    dragIndexRef.current = newIndex;
    const next = filteredCards[newIndex];
    if (next) setFocusedCardId(next.id);
    playCardFlick();
    setIsFlipped(false);
  };
  handleStackScrollRef.current = handleStackScroll;

  const onStackTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setHasInteracted(true);
    const t = e.touches[0];
    if (!t) return;
    dragStartX.current = t.clientX;
    dragDiffRef.current = 0;

    let currentIndex: number;
    if (focusedCardId) {
      currentIndex = filteredCards.findIndex((c) => c.id === focusedCardId);
    } else {
      currentIndex = selectedSort ? 0 : Math.round((filteredCards.length - 1) / 2);
    }
    if (currentIndex === -1) currentIndex = 0;
    dragIndexRef.current = currentIndex;
  };

  const onStackTouchMove = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    const t = e.touches[0];
    if (!t) return;
    const currentX = t.clientX;
    let diff = currentX - dragStartX.current;
    const CARD_WIDTH = 50;

    if (Math.abs(diff) >= CARD_WIDTH) {
      const direction = diff > 0 ? -1 : 1;
      handleStackScroll(direction);
      dragStartX.current += -direction * CARD_WIDTH;
      diff = currentX - dragStartX.current;
    }
    dragDiffRef.current = diff;
    setDragX(diff);
  };

  const onStackTouchEnd = () => {
    setIsDragging(false);
    const CARD_WIDTH = 50;
    const finalDiff = dragDiffRef.current;
    if (Math.abs(finalDiff) > CARD_WIDTH / 2) {
      const direction = finalDiff > 0 ? -1 : 1;
      handleStackScroll(direction);
    }
    setDragX(0);
    dragStartX.current = null;
    dragDiffRef.current = 0;
  };

  // Mouse drag support for desktop
  const onStackMouseDown = (e: React.MouseEvent) => {
    // Only left-click
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    setHasInteracted(true);
    dragStartX.current = e.clientX;
    dragDiffRef.current = 0;

    let currentIndex: number;
    if (focusedCardId) {
      currentIndex = filteredCards.findIndex((c) => c.id === focusedCardId);
    } else {
      currentIndex = selectedSort ? 0 : Math.round((filteredCards.length - 1) / 2);
    }
    if (currentIndex === -1) currentIndex = 0;
    dragIndexRef.current = currentIndex;

    const CARD_WIDTH = 50;

    const onMouseMove = (ev: MouseEvent) => {
      if (dragStartX.current === null) return;
      let diff = ev.clientX - dragStartX.current;
      if (Math.abs(diff) >= CARD_WIDTH) {
        const direction = diff > 0 ? -1 : 1;
        handleStackScrollRef.current(direction);
        dragStartX.current += -direction * CARD_WIDTH;
        diff = ev.clientX - dragStartX.current;
      }
      dragDiffRef.current = diff;
      setDragX(diff);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      const finalDiff = dragDiffRef.current;
      if (Math.abs(finalDiff) > CARD_WIDTH / 2) {
        const direction = finalDiff > 0 ? -1 : 1;
        handleStackScrollRef.current(direction);
      }
      setDragX(0);
      dragStartX.current = null;
      dragDiffRef.current = 0;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Wheel/trackpad scroll support
  const wheelAccumRef = useRef(0);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onStackWheel = (e: React.WheelEvent) => {
    // Only respond to horizontal scrolling — ignore vertical scroll (up/down)
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
    e.preventDefault();
    setHasInteracted(true);
    wheelAccumRef.current += e.deltaX;
    const THRESHOLD = 50;
    if (Math.abs(wheelAccumRef.current) >= THRESHOLD) {
      const direction = wheelAccumRef.current > 0 ? 1 : -1;
      handleStackScroll(direction);
      wheelAccumRef.current = 0;
    }
    if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = setTimeout(() => {
      wheelAccumRef.current = 0;
    }, 150);
  };

  const getShortestOffset = (index: number, focusedIndex: number, total: number): number => {
    let diff = index - focusedIndex;
    while (diff > total / 2) diff -= total;
    while (diff < -total / 2) diff += total;
    return diff;
  };

  const getBackDetails = (card: Card): Array<{ label: string; hasFeature: boolean }> => {
    const hasLounge = !!(
      card.extraInfo?.['Lounge Access'] ||
      card.specialFeatureTitle?.toLowerCase().includes('lounge')
    );
    const hasCredit = !!(
      card.extraInfo?.['Travel Credit'] || card.specialFeatureTitle === 'Travel Credit'
    );
    const hasInsurance = !!(
      card.extraInfo?.['Insurance'] ||
      card.extraInfo?.['Travel Insurance'] ||
      card.specialFeatureTitle === 'Travel Insurance'
    );
    return [
      { label: 'Lounge Access', hasFeature: hasLounge },
      { label: 'Travel Credit', hasFeature: hasCredit },
      { label: 'Travel Insurance', hasFeature: hasInsurance },
    ];
  };

  return {
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
  };
}
