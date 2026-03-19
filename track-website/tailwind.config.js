/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f0a92d',
        'primary-dark': '#d4921f',
      },
    },
  },
  plugins: [],
}
