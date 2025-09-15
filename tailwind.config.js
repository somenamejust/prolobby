/** @type {import('tailwindcss').Config} */

const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', ...defaultTheme.fontFamily.sans],
        // Шрифт для заголовков и лого
        orbitron: ['"Orbitron"', ...defaultTheme.fontFamily.sans],
      },

      colors: {
        'dark-bg': '#111827',
        'dark-surface': '#1F2937',
        'brand-blue': '#1591EA',
        'brand-green': '#45CC2D',
        'brand-red': '#EF4444',
      }
    },
  },
  plugins: [],
}
