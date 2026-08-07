/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:   '#1a1a2e',
        muted: '#AFAFAF',
        duo: {
          DEFAULT: '#7c3aed',
          dark:    '#5b21b6',
          red:     '#ff4b4b',
          reddark: '#d93333',
        },
        brand: {
          DEFAULT: '#7c3aed',
          dark:    '#5b21b6',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', '"Baloo 2"', 'sans-serif'],
        body:    ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
