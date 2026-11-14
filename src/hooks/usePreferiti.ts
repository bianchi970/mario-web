'use client';

import { useCallback, useEffect, useState } from 'react';
import { useProjectId } from '@/hooks/useProjectId';
import { cambiaPreferito, leggiPreferiti } from '@/lib/preferiti';

/**
 * I preferiti della persona che è entrata (`lib/preferiti.ts`). `null` finché
 * non si sa: un Hub che non risponde non diventa «nessun preferito».
 */
export function usePreferiti() {
  const projectId = useProjectId();
  const [preferiti, setPreferiti] = useState<string[] | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let vivo = true;
    leggiPreferiti(projectId).then((p) => { if (vivo) setPreferiti(p); }).catch(() => { if (vivo) setPreferiti(null); });
    return () => { vivo = false; };
  }, [projectId]);

  const cambia = useCallback(async (deviceId: string) => {
    if (!projectId) return;
    try { setPreferiti(await cambiaPreferito(projectId, deviceId)); } catch { /* resta com'era */ }
  }, [projectId]);

  return { preferiti, cambia };
}
