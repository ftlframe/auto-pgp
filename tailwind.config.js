/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{tsx,html}"],
  prefix: "",
  theme: {
    extend: {
      colors: {
        'kiwi': { // Adjusted to match the VS Code theme's darker green
          DEFAULT: '#6B8E23', // Darker green for accents
          'light': '#8DAF47', // A slightly brighter variant for hover/focus
          'dark': '#4D6C17',  // A very dark green for deeper elements if needed
        },
        'emerald': { // Updated alias to reflect the new kiwi shades
          400: '#8DAF47',
          500: '#6B8E23',
          600: '#4D6C17',
        },
        'purple': {
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
        'slate': {
          800: '#1E293B',
          900: '#0F172A'
        }
      },
    },
  },
}