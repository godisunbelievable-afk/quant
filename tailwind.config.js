/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./*.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#0A0A0A',
        'muted-light': '#6B7280',
        'muted-dark': '#8A8A8A',
        'border-light': '#E5E7EB',
        'border-dark': 'rgba(255, 255, 255, 0.12)',
        accent: '#4B2BFF',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        heading: '-0.02em',
      },
    },
  },
  plugins: [],
}
