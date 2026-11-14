'use client';

import { useSession } from '@/context/SessionContext';

/**
 * Chi può aggiungere, spostare e configurare: il RUOLO, come l'Hub
 * (`requireRole('admin','installatore')`). Proposta 4 della pagina delle
 * decisioni (Romeo: sì, 14/11/2026): la spunta installatore del browser la
 * può accendere chiunque e vale solo lì — resta per i dettagli tecnici (id,
 * JSON, versioni), non apre funzioni. Un posto solo per tutta la PWA.
 */
export function useGestisce(): boolean {
  const { user } = useSession();
  return user?.role === 'admin' || user?.role === 'installatore';
}
