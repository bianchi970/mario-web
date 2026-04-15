'use client';

import { useProject } from '@/context/ProjectContext';

export function useProjectId(): string | undefined {
  return useProject().projectId;
}
