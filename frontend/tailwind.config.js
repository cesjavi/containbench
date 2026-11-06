/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'dummy-bob': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-3px) rotate(-3deg)' },
          '75%': { transform: 'translateY(-3px) rotate(3deg)' },
        },
      },
      animation: {
        'dummy-bob': 'dummy-bob 1.4s ease-in-out infinite',
      },
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          900: '#134e4a',
        },
        vultr: {
          blue: '#007bfc',
          dark: '#0a192f',
        }
      }
    },
  },
  plugins: [],
}

