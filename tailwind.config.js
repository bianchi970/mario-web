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
        hub: {
          bg:       '#0f1117',
          surface:  '#1a1d27',
          border:   '#2a2d3a',
          text:     '#e2e8f0',
          muted:    '#64748b',
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
