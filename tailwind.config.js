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
        background: '#F7F8FA',
        card: '#FFFFFF',
        primary: '#111827',
        secondary: '#6B7280',
        border: '#E5E7EB',
        accent: '#2563EB',
        positive: '#10B981',
        warning: '#F59E0B',
        negative: '#EF4444',
      },
      borderRadius: {
        card: '18px',
        button: '14px',
      },
    },
  },
  plugins: [],
};
