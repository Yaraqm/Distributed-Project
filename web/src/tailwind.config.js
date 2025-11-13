/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Safelist dynamic colors used in Dashboard.tsx
  safelist: [
    {
      pattern: /(bg|text)-(blue|purple|green|amber|red)-(50|600|700|400|500)/,
    },
    'bg-gray-900',
    'text-gray-100',
  ],
}
