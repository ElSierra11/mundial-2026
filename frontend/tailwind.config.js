/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#05070a',      // Premium dark background
          card: '#0c0f16',      // Luxury charcoal glass card
          accent: '#e5c158',    // Official Trophy Gold
          purple: '#1d4ed8',    // Deep Navy Blue (USA)
          red: '#dc2626',       // Crimson Red (Canada)
          green: '#16a34a',     // Emerald Green (Mexico)
          gold: '#e5c158',      // Trophy Gold
          light: '#f3f4f6',     // Light grey text
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'stadium-gradient': 'radial-gradient(circle at top, #171b26 0%, #05070a 100%)',
      }
    },
  },
  plugins: [],
}
