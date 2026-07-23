'use client';

import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushEnableBanner({ projectId }: { projectId: string }) {
  const { status, subscribe } = usePushNotifications(projectId);

  if (status === 'checking' || status === 'subscribed' || status === 'unsupported') return null;

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-2">
        <BellOff className="h-3.5 w-3.5 shrink-0 text-white/30" />
        <span className="text-xs text-white/30">Notifiche bloccate — abilita nelle impostazioni browser</span>
      </div>
    );
  }

  // status === 'idle'
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-blue-500/20 bg-blue-500/[0.06] px-4 py-3">
      <Bell className="h-4 w-4 shrink-0 text-blue-400" />
      <span className="flex-1 text-sm text-white/70">Abilita notifiche push</span>
      <button
        onClick={() => void subscribe()}
        className="rounded-xl border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs text-blue-300 active:bg-blue-500/30"
      >
        Abilita
      </button>
    </div>
  );
}
