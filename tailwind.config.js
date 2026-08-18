/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F1F1EE", panel: "#FFFFFF", ink: "#14171F", muted: "#6C7079",
        signal: "#0E7C4A", signalSoft: "#E4F2E9", amber: "#C7811A", amberSoft: "#FBF0DD",
        rose: "#B4483A", roseSoft: "#F8E9E6", rail: "#E4E3DD", railDark: "#D8D6CE",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
