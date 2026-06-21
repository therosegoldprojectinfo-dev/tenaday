/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:   '#3C3C3C',
        muted: '#AFAFAF',

        stoneage: {
          primary: '#FF9600', // vivid amber — pucks, buttons, accents
          dark:    '#CC7700', // darker amber — 3D button shadow
          accent:  '#FFB700', // warm gold — highlights
          bg:      '#FFFFFF',
        },
        medieval: {
          primary: '#9B59B6',
          dark:    '#7D3C98',
          accent:  '#F1C40F',
          bg:      '#FFFFFF',
        },
        industrial: {
          primary: '#E74C3C',
          dark:    '#C0392B',
          accent:  '#F39C12',
          bg:      '#FFFFFF',
        },
        futuristic: {
          primary: '#00B4D8',
          dark:    '#0088A8',
          accent:  '#7B2FBE',
          bg:      '#FFFFFF',
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
