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

        // ── hub-* mantenuti per compatibilità fino a migrazione completa ──
        hub: {
          bg:       '#0f1117',
          surface:  '#1a1d27',
          border:   '#2a2d3a',
          text:     '#e2e8f0',
          muted:    '#9aa3b2',   /* alzato da #64748b → contrasto ~5:1 su dark bg */
          accent:   '#3b82f6',
          green:    '#22c55e',
          red:      '#ef4444',
          amber:    '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
