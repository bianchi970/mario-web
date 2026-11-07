import { TextEncoder, TextDecoder } from 'node:util';
// Il disegno «server» di React vuole TextEncoder, che jsdom non ha.
Object.assign(globalThis, { TextEncoder, TextDecoder });
/* eslint-disable @typescript-eslint/no-require-imports */
const { act } = require('react') as typeof import('react');
const { renderToString } = require('react-dom/server') as typeof import('react-dom/server');
const { hydrateRoot } = require('react-dom/client') as typeof import('react-dom/client');
const { ProjectProvider, useProject } = require('@/context/ProjectContext') as typeof import('@/context/ProjectContext');
/* eslint-enable @typescript-eslint/no-require-imports */

// L'hydration non fallisce per l'impianto salvato (7/11/2026). Letto dal
// localStorage nel primo disegno, il browser disegnava ciò che il server non
// sa — la campanella della barra — e React ridisegnava tutto, togliendo anche
// il tema scelto. Qui: il «server» disegna senza impianto, il «browser» ha
// l'impianto salvato e idrata.

function Campanella() {
  const { projectId } = useProject();
  return <div>{projectId ? <span data-testid="campanella">{projectId}</span> : null}</div>;
}

describe('ProjectProvider e hydration', () => {
  afterEach(() => localStorage.clear());

  it('PJ-01 l\'impianto salvato non fa fallire l\'hydration, e arriva', async () => {
    localStorage.clear();
    const html = renderToString(<ProjectProvider><Campanella /></ProjectProvider>);
    localStorage.setItem('mario_project_id', 'default');

    const contenitore = document.createElement('div');
    contenitore.innerHTML = html;
    document.body.appendChild(contenitore);
    const errori: unknown[] = [];
    await act(async () => {
      hydrateRoot(contenitore, <ProjectProvider><Campanella /></ProjectProvider>, {
        onRecoverableError: (e) => errori.push(e),
      });
    });

    expect(errori).toEqual([]);
    expect(contenitore.querySelector('[data-testid="campanella"]')?.textContent).toBe('default');
    document.body.removeChild(contenitore);
  });
});
