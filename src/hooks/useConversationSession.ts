'use client';
import { useEffect, useState } from 'react';

/**
 * useConversationSession — B83
 *
 * Gestisce un session_id conversazionale persistente in sessionStorage.
 * Una sessione per projectId: si resetta ad ogni nuova scheda/navigazione.
 * Il bottone "Nuova" forza un nuovo UUID → Brain riparte da zero.
 */
export function useConversationSession(projectId: string | undefined) {
  const key = projectId ? `mario_session_${projectId}` : null;
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    if (!key) return;
    const existing = sessionStorage.getItem(key);
    if (existing) {
      setSessionId(existing);
      return;
    }
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    setSessionId(id);
  }, [key]);

  function clearSession() {
    if (!key) return;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    setSessionId(id);
  }

  return { sessionId, clearSession };
}
