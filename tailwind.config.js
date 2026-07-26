/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:   '#3C3C3C',
        muted: '#AFAFAF',
        duo: {
          DEFAULT: '#58cc02',
          dark:    '#58a700',
          red:     '#ff4b4b',
          reddark: '#d93333',
        },
        brand: {
          DEFAULT: '#58cc02',
          dark:    '#58a700',
        },
      },
      fontFamily: {
        display: ['"Baloo 2"', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
