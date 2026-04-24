'use client';

import { createContext, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'mario_project_id';

type ProjectContextValue = {
  projectId: string | undefined;
  setProjectId: (projectId: string) => void;
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

  const value = useMemo<ProjectContextValue>(() => ({
    projectId,
    setProjectId(nextProjectId: string) {
      const trimmed = nextProjectId.trim();
      const next = trimmed || undefined;
      setProjectIdState(next);

      if (typeof window === 'undefined') {
        return;
      }

      if (next) {
        window.localStorage.setItem(STORAGE_KEY, next);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    },
  }), [projectId]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('ProjectProvider missing');
  }
  return context;
}
