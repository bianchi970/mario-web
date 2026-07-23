'use client';

import { useCallback, useEffect, useState } from 'react';

export type PushStatus = 'unsupported' | 'checking' | 'denied' | 'subscribed' | 'idle';

function _urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer as ArrayBuffer;
}

export function usePushNotifications(projectId: string) {
  const [status, setStatus] = useState<PushStatus>('checking');

  // Controlla stato iniziale (già iscritto / denied / non supportato)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? 'subscribed' : 'idle'))
      .catch(() => setStatus('idle'));
  }, []);

  const subscribe = useCallback(async () => {
    try {
      // 1. Chiave pubblica VAPID dall'hub
      const vapidRes = await fetch('/api/hub/push/vapid-public');
      if (!vapidRes.ok) return;
      const { publicKey } = (await vapidRes.json()) as { publicKey: string };

      // 2. Permesso browser
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      // 3. Subscribe al push service
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: _urlBase64ToUint8Array(publicKey),
      });

      // 4. Registra subscription sull'hub
      const subJson = sub.toJSON();
      const res = await fetch(`/api/hub/push/${projectId}/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...subJson, role: 'user', label: 'PWA' }),
      });
      if (!res.ok) return;

      setStatus('subscribed');
    } catch {
      setStatus(
        typeof Notification !== 'undefined' && Notification.permission === 'denied'
          ? 'denied'
          : 'idle',
      );
    }
  }, [projectId]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      await fetch('/api/hub/push/subscribe', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
      setStatus('idle');
    } catch { /* best effort */ }
  }, []);

  return { status, subscribe, unsubscribe };
}
