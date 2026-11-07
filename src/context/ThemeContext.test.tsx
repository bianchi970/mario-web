import { render } from '@testing-library/react';
import { ThemeProvider } from '@/context/ThemeContext';

// Un tema scelto resta scelto (7/11/2026). Lo script anti-FOUC del layout mette
// `data-theme` prima di React; se l'hydration fallisce — e falliva: la
// campanella della barra c'è nel browser e non sul server — React ridisegna e
// l'attributo si perde. Il provider leggeva il tema salvato e non lo
// riapplicava: «scuro» diventava «Auto».

describe('ThemeProvider', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('TH-01 all\'avvio riapplica il tema salvato', () => {
    localStorage.setItem('mario_theme', 'dark');
    render(<ThemeProvider><div /></ThemeProvider>);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('TH-02 «auto» salvato: nessun attributo, decide il sistema', () => {
    localStorage.setItem('mario_theme', 'auto');
    document.documentElement.setAttribute('data-theme', 'light');
    render(<ThemeProvider><div /></ThemeProvider>);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
