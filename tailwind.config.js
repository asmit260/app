/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sand: {
          50: 'var(--sand-50)',
          100: 'var(--sand-100)',
          200: 'var(--sand-200)',
          300: 'var(--sand-300)',
          400: 'var(--sand-400)',
        },
        stone: {
          500: 'var(--stone-500)',
          600: 'var(--stone-600)',
          700: 'var(--stone-700)',
        },
        ink: {
          800: 'var(--ink-800)',
          900: 'var(--ink-900)',
        },
        navy: {
          100: 'var(--navy-100)',
          600: 'var(--navy-600)',
          700: 'var(--navy-700)',
          800: '#163040',
          850: '#122838',
          900: '#0E2030',
          950: '#0A1820',
        },
        amber: {
          100: 'var(--amber-100)',
          300: '#E0A85C',
          400: 'var(--amber-400, #D4974A)',
          500: 'var(--amber-500)',
        },
        status: {
          watching: 'var(--status-watching)',
          completed: 'var(--status-completed)',
          plan: 'var(--status-plan)',
          hold: 'var(--status-hold)',
          dropped: 'var(--status-dropped)',
          'watching-bg': 'var(--status-watching-bg)',
          'completed-bg': 'var(--status-completed-bg)',
          'plan-bg': 'var(--status-plan-bg)',
          'hold-bg': 'var(--status-hold-bg)',
          'dropped-bg': 'var(--status-dropped-bg)',
        }
      },
      fontFamily: {
        display: ['Lora', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'manga': '3px 3px 0px 0px rgba(28,25,23,1)',
        'manga-hover': '5px 5px 0px 0px rgba(28,25,23,1)',
        'manga-lg': '6px 6px 0px 0px rgba(28,25,23,1)',
      }
    },
  },
  plugins: [],
}
