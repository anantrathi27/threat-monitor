/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#060a0f",
        surface: "#0c1218",
        surface2: "#111820",
        border: "#1a2530",
        border2: "#243040",
        accent: "#00d4ff",
        accent2: "#0066ff",
        critical: "#ff2040",
        high: "#ff6b00",
        medium: "#ffb800",
        low: "#00c8ff",
      },
      fontFamily: {
        sans: ["Syne", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
