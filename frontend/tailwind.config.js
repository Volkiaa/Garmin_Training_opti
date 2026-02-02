/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        readiness: {
          high: '#22c55e',
          moderate: '#eab308',
          low: '#f97316',
          recovery: '#ef4444',
          rest: '#dc2626',
        },
        discipline: {
          hyrox: '#8b5cf6',
          strength: '#ec4899',
          run: '#3b82f6',
          bike: '#22c55e',
          swim: '#06b6d4',
          other: '#6b7280',
        },
      },
    },
  },
  plugins: [],
}
