/**
 * Stub for GTM analytics. The PH Copilot mobile app doesn't ship analytics
 * yet; the upstream Card Picker tool fires GTM events through this bridge
 * so we keep the call sites intact but make them no-ops.
 */

export function pushGtmEvent(_event: string, _payload?: Record<string, unknown>): void {
  // intentional no-op
}

export function getElapsedTime(_startMs: number): { minutes: number; seconds: number } {
  return { minutes: 0, seconds: 0 };
}
