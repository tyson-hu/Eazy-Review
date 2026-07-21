/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#f5f5f7',
        card: '#ffffff',
        primary: '#1d1d1f',
        secondary: '#6b6b6b',
        border: '#e0e0e0',
        accent: '#0066cc',
        positive: '#047857',
        warning: '#b45309',
        negative: '#b91c1c',
      },
      borderRadius: {
        card: '18px',
        button: '9999px',
      },
    },
  },
  plugins: [],
};
