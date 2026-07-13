'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'mario_project_id';

type AuthorizedProject = { id: string; name: string };

/**
 * B96 — stato dei progetti autorizzati:
 *   offline      → non ancora caricato o errore di rete (default; input libero)
 *   loading      → fetch in corso
 *   ok           → autenticato, lista non vuota
 *   empty        → autenticato ma nessun progetto autorizzato → blocca operazioni
 *   unauthenticated → 401 → input libero (modalità locale)
 */
export type ProjectsStatus = 'offline' | 'loading' | 'ok' | 'empty' | 'unauthenticated';

type ProjectContextValue = {
  projectId: string | undefined;
  setProjectId: (projectId: string) => void;
  authorizedProjects: AuthorizedProject[];
  projectsStatus: ProjectsStatus;
  /** Carica (o ricarica) la lista progetti autorizzati dal Brain. */
  fetchAuthorizedProjects: () => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

function readStoredProjectId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)?.trim();
  return stored ? stored : (process.env.NEXT_PUBLIC_DEFAULT_PROJECT_ID || undefined);
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projectId, setProjectIdState] = useState<string | undefined>(() => readStoredProjectId());
  const [authorizedProjects, setAuthorizedProjects] = useState<AuthorizedProject[]>([]);
  const [projectsStatus, setProjectsStatus] = useState<ProjectsStatus>('offline');

  // Ref per avere projectId aggiornato senza aggiungere dipendenze a fetchAuthorizedProjects
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  // B96: fetch lista progetti. Stabile (nessuna dipendenza) — sicuro da usare in useEffect altrui.
  const fetchAuthorizedProjects = useCallback(async () => {
    setProjectsStatus('loading');
    try {
      const r = await fetch('/api/brain/projects');
      if (r.status === 401) { setProjectsStatus('unauthenticated'); return; }
      if (!r.ok)            { setProjectsStatus('offline');         return; }
      const json = await r.json();
      const list: AuthorizedProject[] = json?.data?.projects ?? [];
      setAuthorizedProjects(list);
      setProjectsStatus(list.length > 0 ? 'ok' : 'empty');
    } catch {
      setProjectsStatus('offline');
    }
  }, []); // stabile — non cambia mai

  // Auto-seleziona il primo progetto autorizzato se quello corrente non è in lista
  useEffect(() => {
    if (authorizedProjects.length === 0) return;
    const current = projectIdRef.current?.trim();
    if (!current || !authorizedProjects.find(p => p.id === current)) {
      const first = authorizedProjects[0].id;
      setProjectIdState(first);
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, first);
    }
  }, [authorizedProjects]);

  const value = useMemo<ProjectContextValue>(() => ({
    projectId,
    authorizedProjects,
    projectsStatus,
    fetchAuthorizedProjects,
    setProjectId(nextProjectId: string) {
      const trimmed = nextProjectId.trim();
      const next = trimmed || undefined;
      setProjectIdState(next);

      if (typeof window === 'undefined') return;

      if (next) {
        window.localStorage.setItem(STORAGE_KEY, next);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    },
  }), [projectId, authorizedProjects, projectsStatus, fetchAuthorizedProjects]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('ProjectProvider missing');
  }
  return context;
}
