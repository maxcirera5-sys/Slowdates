/** @type {import('tailwindcss').Config} */
// Optional: powers NativeWind className styling once enabled (see README).
// Mirrors the tokens in src/theme so className and the StyleSheet theme agree.
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#060816',
        primary: '#7C4DFF',
        secondary: '#A855F7',
        accent: '#C084FC',
        success: '#34D399',
        text: '#FFFFFF',
        'text-secondary': '#A1A1AA',
      },
    },
  },
  plugins: [],
};
