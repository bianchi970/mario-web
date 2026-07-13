/**
 * home-layout.ts — gestione layout home per utente + progetto.
 *
 * Strategia server-first con cache localStorage:
 *   - Lettura: prima il server (GET /api/hub/user-prefs/home-layout), poi localStorage come fallback
 *   - Scrittura: localStorage immediato (ottimistic UI) + sync server in background
 *
 * Layout separato per ogni coppia (username, projectId).
 * Il server è l'autorità; localStorage è solo cache locale.
 */

export interface HomeLayout {
  sections: string[];   // ordine delle sezioni nella home (es. ['devices', 'scenarios', 'rooms'])
  collapsed: string[];  // sezioni collassate
}

const DEFAULT_LAYOUT: HomeLayout = {
  sections:  ['devices', 'scenarios', 'rooms', 'security', 'energy'],
  collapsed: [],
};

function localKey(username: string, projectId: string): string {
  return `mario_home_layout_${username}_${projectId}`;
}

function readLocal(username: string, projectId: string): HomeLayout | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(localKey(username, projectId));
    return raw ? (JSON.parse(raw) as HomeLayout) : null;
  } catch {
    return null;
  }
}

function writeLocal(username: string, projectId: string, layout: HomeLayout): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(localKey(username, projectId), JSON.stringify(layout));
  } catch { /* quota exceeded — ignora */ }
}

/**
 * Carica il layout per l'utente+progetto.
 * 1. Tenta GET /api/hub/user-prefs/home-layout dal server
 * 2. Se fallisce, legge localStorage
 * 3. Se anche quello manca, restituisce il layout di default
 */
export async function loadHomeLayout(username: string, projectId: string): Promise<HomeLayout> {
  try {
    const res = await fetch(`/api/hub/user-prefs/home-layout?project_id=${encodeURIComponent(projectId)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json() as { success: boolean; data?: { layout?: HomeLayout | null } };
      if (data.success && data.data?.layout) {
        // Aggiorna cache locale con i dati del server
        writeLocal(username, projectId, data.data.layout);
        return data.data.layout;
      }
    }
  } catch { /* fallback a localStorage */ }

  return readLocal(username, projectId) ?? { ...DEFAULT_LAYOUT };
}

/**
 * Salva il layout per l'utente+progetto.
 * 1. Scrive subito in localStorage (ottimistic UI)
 * 2. Manda PUT al server in background (non attende)
 */
export function saveHomeLayout(username: string, projectId: string, layout: HomeLayout): void {
  writeLocal(username, projectId, layout);

  // Sync al server in background (best-effort)
  fetch('/api/hub/user-prefs/home-layout', {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ project_id: projectId, layout }),
  }).catch(() => { /* best-effort */ });
}

export { DEFAULT_LAYOUT };
