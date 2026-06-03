'use client';

// Opaque, persistent client ID. Used as the server-side key for push
// subscriptions and alert projections so the user keeps notifications
// across sessions / IndexedDB clears (which would wipe their cards but
// leave localStorage untouched). Not tied to any PII.

const KEY = 'ph-device-id';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // localStorage may be unavailable (private mode, blocked cookies).
    // Fall back to a session-only id so the rest of the app doesn't crash.
    return crypto.randomUUID();
  }
}
