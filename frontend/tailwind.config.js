/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f4f7fb",
        surface: "#ffffff",
        surface2: "#f1f5f9",
        border: "#e2e8f0",
        ink: "#172033",
        muted: "#64748b",
        accent: {
          DEFAULT: "#315be8",
          soft: "#5275ed",
          dim: "#2446bd",
        },
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["DM Serif Display", "ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
