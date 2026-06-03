'use client';

// React hook that wraps the browser push subscription lifecycle. Detects
// support, requests permission, registers the SW, subscribes to the push
// service, and syncs the resulting subscription to our /api/push/subscribe
// endpoint. Also exposes a sendTest() that fires a notification via
// /api/push/test so the user can verify the chain.
//
// iOS quirk worth knowing: web push only works on iOS 16.4+ AFTER the
// user installs the site to their home screen (Add to Home Screen). On
// plain Safari, Notification.requestPermission() resolves to 'denied'
// silently. The Notifications card shows guidance for that case.

import { useCallback, useEffect, useState } from 'react';
import { getOrCreateDeviceId } from '@/lib/device-id';

export type PushState =
  | 'unsupported'
  | 'default' // permission not requested yet
  | 'denied'
  | 'granted' // permission given but no subscription yet
  | 'subscribed'; // permission + active subscription

export interface PushTestResult {
  ok: boolean;
  delivered: number;
  total: number;
}

export interface UseWebPushReturn {
  state: PushState;
  loading: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  sendTest: () => Promise<PushTestResult | null>;
}

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function useWebPush(): UseWebPushReturn {
  const [state, setState] = useState<PushState>('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial detection — runs once.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setState('unsupported');
      return;
    }
    if (!VAPID_KEY) {
      setError('VAPID public key not configured');
      setState('unsupported');
      return;
    }
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        if (!reg) {
          setState(Notification.permission === 'denied' ? 'denied' : 'default');
          return;
        }
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setState('subscribed');
        } else if (Notification.permission === 'granted') {
          setState('granted');
        } else if (Notification.permission === 'denied') {
          setState('denied');
        } else {
          setState('default');
        }
      } catch {
        setState(Notification.permission === 'denied' ? 'denied' : 'default');
      }
    })();
  }, []);

  const enable = useCallback(async () => {
    if (!VAPID_KEY) return;
    setLoading(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setState(perm === 'denied' ? 'denied' : 'default');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      });
      const subJson = sub.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error('Browser returned an incomplete subscription');
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: getOrCreateDeviceId(),
          subscription: {
            endpoint: subJson.endpoint,
            keys: { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth },
          },
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? `subscribe failed: ${res.status}`);
      }
      setState('subscribed');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => undefined);
      }
      setState(Notification.permission === 'granted' ? 'granted' : 'default');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTest = useCallback(async (): Promise<PushTestResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getOrCreateDeviceId() }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        delivered?: number;
        total?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? `test failed: ${res.status}`);
        return null;
      }
      return {
        ok: json.ok ?? false,
        delivered: json.delivered ?? 0,
        total: json.total ?? 0,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { state, loading, error, enable, disable, sendTest };
}

// VAPID public keys are URL-safe base64; PushManager.subscribe expects a
// BufferSource of the raw bytes. We build a concrete ArrayBuffer-backed
// Uint8Array (vs Uint8Array.from which returns ArrayBufferLike-typed,
// which trips TS strict mode against the BufferSource interface).
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}
