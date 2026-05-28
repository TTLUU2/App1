'use client';

import { type ReactNode, useRef } from 'react';
import { DevMenu } from './dev-menu';
import { useState } from 'react';

/**
 * Wraps the page header. Three taps inside 800ms open the hidden dev menu.
 * Used instead of long-press because long-press conflicts with VoiceOver
 * exploration gestures.
 */
export function TripleTapHeader({ children }: { children: ReactNode }) {
  const taps = useRef<number[]>([]);
  const [devOpen, setDevOpen] = useState(false);

  function handleTap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 800), now];
    if (taps.current.length >= 3) {
      taps.current = [];
      setDevOpen(true);
    }
  }

  return (
    <header
      onClick={handleTap}
      className="cursor-default select-none"
      // Keyboard escape hatch for the dev menu: shift+? on the page opens it too.
      onKeyDown={(e) => {
        if (e.shiftKey && (e.key === '?' || e.key === '/')) setDevOpen(true);
      }}
    >
      {children}
      <DevMenu open={devOpen} onOpenChange={setDevOpen} />
    </header>
  );
}
