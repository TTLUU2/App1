'use client';

// Persisted voice-output toggle, mirrors ThemeToggle's pattern. The
// global toggle silences every speak() call across the app — mount
// greetings on Tab 3 / Tab 4, post-save welcomes, Copilot answers,
// voice review walkthrough. Voice INPUT (mic) is unaffected; the user
// can still talk to the app, just doesn't hear it talk back.
//
// Hydration: subscribes to the Zustand store + hydrates on mount. The
// underlying `lib/tts.ts` reads the same value directly from
// localStorage so server-side hydration order doesn't matter for the
// silencing logic.

import { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useUserPreferencesStore } from '@/store/user-preferences';
import { cancelSpeech } from '@/lib/tts';

export function VoiceToggle() {
  const loaded = useUserPreferencesStore((s) => s.loaded);
  const enabled = useUserPreferencesStore((s) => s.preferences.voiceOutputEnabled);
  const setEnabled = useUserPreferencesStore((s) => s.setVoiceOutputEnabled);
  const hydrate = useUserPreferencesStore((s) => s.hydrate);

  // Make sure the store has read localStorage before we render the
  // initial toggle state — otherwise we'd flash the default-on state
  // for a frame even when the user disabled voice last session.
  useEffect(() => {
    if (!loaded) hydrate();
  }, [loaded, hydrate]);

  function onToggle() {
    const next = !enabled;
    setEnabled(next);
    // If we're turning OFF mid-greeting, kill whatever's currently
    // playing so it doesn't finish out.
    if (!next) cancelSpeech();
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={enabled ? 'Mute spoken voice' : 'Unmute spoken voice'}
      aria-pressed={enabled}
      title={enabled ? 'Mute spoken voice' : 'Unmute spoken voice'}
      className="grid h-8 w-8 place-items-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ph-red)] dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {enabled ? (
        <Volume2 className="h-4 w-4" aria-hidden />
      ) : (
        <VolumeX className="h-4 w-4 text-zinc-400" aria-hidden />
      )}
    </button>
  );
}
