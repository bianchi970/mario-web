/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Token semantici B97 (via CSS custom properties) ──────────────
        // Formato: rgb(R G B / <alpha-value>) per supportare /opacity in Tailwind
        primary:     'rgb(var(--color-primary) / <alpha-value>)',
        surface:     'rgb(var(--color-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--color-surface-2) / <alpha-value>)',
        text:        'rgb(var(--color-text) / <alpha-value>)',
        'text-2':    'rgb(var(--color-text-2) / <alpha-value>)',
        border:      'rgb(var(--color-border) / <alpha-value>)',
        success:     'rgb(var(--color-success) / <alpha-value>)',
        warning:     'rgb(var(--color-warning) / <alpha-value>)',
        danger:      'rgb(var(--color-danger) / <alpha-value>)',
        offline:     'rgb(var(--color-offline) / <alpha-value>)',
        focus:       'rgb(var(--color-focus) / <alpha-value>)',
        disabled:    'rgb(var(--color-disabled) / <alpha-value>)',
        'bg-app':    'var(--bg-app)',

        // ── hub-*: altri NOMI degli stessi token, non una seconda palette ──
        // Fino al 7/11/2026 erano i colori fissi del tema scuro (490 usi): nel
        // tema chiaro la scheda era beige e il testo restava #e2e8f0, bianco.
        // `src/app/tema.test.ts` (TE-01) fallisce se un colore fisso torna.
        hub: {
          bg:       'rgb(var(--color-inset) / <alpha-value>)',
          surface:  'rgb(var(--color-surface) / <alpha-value>)',
          border:   'rgb(var(--color-border) / <alpha-value>)',
          text:     'rgb(var(--color-text) / <alpha-value>)',
          muted:    'rgb(var(--color-text-2) / <alpha-value>)',
          accent:   'rgb(var(--color-accent) / <alpha-value>)',
          green:    'rgb(var(--color-success) / <alpha-value>)',
          red:      'rgb(var(--color-danger) / <alpha-value>)',
          amber:    'rgb(var(--color-warning) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
