import TopBar from '@/components/layout/TopBar';
import SettingsClient from './SettingsClient';
import { getAdapters, getSystem, getHealth } from '@/lib/hub-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [healthRes, adaptersRes, systemRes] = await Promise.allSettled([
    getHealth(),
    getAdapters(),
    getSystem(),
  ]);

  const adapters = adaptersRes.status === 'fulfilled' ? adaptersRes.value.adapters : [];
  const system   = systemRes.status   === 'fulfilled' ? systemRes.value : null;
  const adaptersAvailable = adaptersRes.status === 'fulfilled';
  const systemAvailable = healthRes.status === 'fulfilled';

  return (
    <>
      <TopBar title="Settings" />
      <main className="flex-1 p-5 max-w-2xl space-y-6">
        <SettingsClient
          adapters={adapters}
          system={system}
          adaptersAvailable={adaptersAvailable}
          systemAvailable={systemAvailable}
          hubDisplayUrl={process.env.NEXT_PUBLIC_HUB_DISPLAY_URL || 'http://localhost:4001'}
        />
      </main>
    </>
  );
}
