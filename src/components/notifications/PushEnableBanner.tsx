'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

export default function PushEnableBanner({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<'checking' | 'idle' | 'denied' | 'subscribed' | 'unsupported'>('checking');

  useEffect(() => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
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
    } catch {
      setStatus('unsupported');
    }
  }, []);

  async function handleSubscribe() {
    try {
      const vapidRes = await fetch('/api/hub/push/vapid-public');
      if (!vapidRes.ok) return;
      const { publicKey } = (await vapidRes.json()) as { publicKey: string };

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setStatus('denied'); return; }

      const reg = await navigator.serviceWorker.ready;

      // converte base64url → ArrayBuffer per applicationServerKey
      const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
      const b64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const raw = atob(b64);
      const key = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer,
      });

      const subJson = sub.toJSON();
      const res = await fetch(`/api/hub/push/${projectId}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subJson, role: 'user', label: 'PWA' }),
      });
      if (res.ok) setStatus('subscribed');
    } catch {
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setStatus('denied');
      }
    }
  }

  if (status === 'checking' || status === 'subscribed' || status === 'unsupported') return null;

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-2">
        <BellOff className="h-3.5 w-3.5 shrink-0 text-white/30" />
        <span className="text-xs text-white/30">Notifiche bloccate — abilita nelle impostazioni browser</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-blue-500/20 bg-blue-500/[0.06] px-4 py-3">
      <Bell className="h-4 w-4 shrink-0 text-blue-400" />
      <span className="flex-1 text-sm text-white/70">Abilita notifiche push</span>
      <button
        onClick={() => void handleSubscribe()}
        className="rounded-xl border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs text-blue-300 active:bg-blue-500/30"
      >
        Abilita
      </button>
    </div>
  );
}
