/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sarabun", "sans-serif"],
      },
      colors: {
        navy: {
          DEFAULT: "#0f172a",
          50: "#f1f5f9",
          100: "#e2e8f0",
          800: "#1e293b",
          900: "#0f172a",
        },
        accent: {
          DEFAULT: "#06b6d4",
          50: "#ecfeff",
          600: "#06b6d4",
          700: "#0891b2",
        },
      },
    },
  },
  plugins: [],
};
