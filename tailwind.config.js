/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // This overrides the default font to use monospace everywhere
        sans: ['"Courier New"', 'Courier', 'monospace'], 
      },
    },
  },
  plugins: [],
}
