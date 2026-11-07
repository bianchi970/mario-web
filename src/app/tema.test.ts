/**
 * @jest-environment node
 *
 * Il tema si legge, in chiaro e in scuro.
 *
 * Il 7/11/2026, dalle schermate di Romeo: nel tema chiaro i titoli delle schede
 * erano bianchi su beige (Stanze, Impostazioni, Energia, Sicurezza). Due
 * palette: i token `--color-*` cambiano col tema, i nomi `hub-*` di
 * `tailwind.config.js` erano i colori fissi del tema scuro — 490 usi. La
 * scheda prendeva il beige, il testo restava `#e2e8f0`.
 *
 *   TE-01  i nomi `hub-*` sono il tema, non colori fissi
 *   TE-02  «chiaro» scelto e «Auto» col sistema chiaro dicono gli stessi valori
 *   TE-03  ogni colore di testo si legge sui fondi delle schede (WCAG 4,5:1)
 */

import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.join(__dirname, 'globals.css'), 'utf8').replace(/\r\n/g, '\n');

/** I `--color-*` di un blocco CSS, dal selettore alla prima `}`. */
function tokenDi(selettore: string): Record<string, number[]> {
  const i = css.indexOf(selettore);
  if (i < 0) throw new Error(`blocco mancante: ${selettore}`);
  const corpo = css.slice(i, css.indexOf('}', i));
  const out: Record<string, number[]> = {};
  for (const m of corpo.matchAll(/--color-([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) {
    out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return out;
}

const SCURO  = tokenDi(':root,\n[data-theme="dark"]');
const CHIARO = tokenDi('[data-theme="light"] {');
const AUTO   = tokenDi(':root:not([data-theme="dark"]):not([data-theme="light"])');

function luminanza([r, g, b]: number[]): number {
  const c = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}
function contrasto(a: number[], b: number[]): number {
  const [l1, l2] = [luminanza(a), luminanza(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Un colore al `alfa` sopra un fondo, come lo disegna `bg-x/20`. */
const sopra = (c: number[], fondo: number[], alfa: number) => c.map((v, i) => v * alfa + fondo[i] * (1 - alfa));

// `primary-ink`: l'arancio del marchio come TESTO (7/11/2026: in chiaro `primary` come
// testo faceva 2,2:1). Il `primary` pieno resta per fondi, bordi e marchio.
const TESTI = ['text', 'text-2', 'accent', 'success', 'warning', 'danger', 'offline', 'primary-ink'];
const FONDI = ['surface', 'inset'];

describe('il tema', () => {
  it('TE-01 i nomi hub-* sono il tema, non colori fissi', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hub = require('../../tailwind.config.js').theme.extend.colors.hub as Record<string, string>;
    const fissi = Object.entries(hub).filter(([, v]) => !String(v).includes('var(--'));
    expect(fissi).toEqual([]);
  });

  it('TE-02 «chiaro» e «Auto» col sistema chiaro dicono gli stessi valori', () => {
    expect(AUTO).toEqual(CHIARO);
  });

  for (const [nome, tema] of [['scuro', SCURO], ['chiaro', CHIARO]] as const) {
    it(`TE-04 ${nome}: l'arancio-testo si legge anche sulla tinta arancio (voce attiva, badge)`, () => {
      const tinta = sopra(tema.primary, tema.surface, 0.2);
      expect(Number(contrasto(tema['primary-ink'] ?? [0, 0, 0], tinta).toFixed(2))).toBeGreaterThanOrEqual(4.5);
    });

    it(`TE-03 ${nome}: ogni testo si legge sulle schede e sulle caselle (≥ 4,5:1)`, () => {
      const bassi: string[] = [];
      for (const t of TESTI) for (const f of FONDI) {
        if (!tema[t] || !tema[f]) { bassi.push(`${t} su ${f}: token mancante`); continue; }
        const c = contrasto(tema[t], tema[f]);
        if (c < 4.5) bassi.push(`${t} su ${f}: ${c.toFixed(2)}`);
      }
      expect(bassi).toEqual([]);
    });
  }
});
