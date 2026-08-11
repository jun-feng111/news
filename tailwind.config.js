/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#5b8def',
        'cat-ai': '#5b8def',
        'cat-tech': '#4ade80',
        'cat-finance': '#fb923c',
        'cat-general': '#a78bfa',
        'cat-dev': '#22d3ee',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      maxWidth: {
        '7xl': '1280px',
        '8xl': '1440px',
      },
    },
  },
  plugins: [],
}
