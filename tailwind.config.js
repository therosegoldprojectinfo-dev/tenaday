/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Shared UI chrome (top bar, buttons, text) - not era-specific
        ink: '#2B2118',
        cream: '#FBF3E7',

        // One color group per era. Placeholder values for now -
        // Claude Design / Claude Code should replace these once the
        // real palette is locked, but the structure (era.primary,
        // era.accent, era.bg) should stay so every screen can just
        // reference "stoneage.primary" etc. instead of hardcoding hex.
        stoneage: {
          primary: '#8C6A4F',
          accent: '#D98E4A',
          bg: '#F2E8DC',
        },
        medieval: {
          primary: '#5B4B8A',
          accent: '#C9A227',
          bg: '#EFEAF7',
        },
        industrial: {
          primary: '#4A5A66',
          accent: '#D9762D',
          bg: '#E8ECEF',
        },
        futuristic: {
          primary: '#1F6F8B',
          accent: '#4FE0C9',
          bg: '#0E1A24',
        },
      },
      fontFamily: {
        // Placeholder fonts - swap once Claude Design locks typography
        display: ['"Baloo 2"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
