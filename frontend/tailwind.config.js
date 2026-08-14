/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#00A63E",
          dark: "#058C39",
          pale: "#E5F6EC",
        },
        ink: "#1E1E1E",
        muted: "#737373",
        faint: "#9CA3AF",
        surface: "#FFFFFF",
        "surface-muted": "#F4F7F5",
        line: "#E5E6E8",
        amber: {
          pale: "#FFEDD4",
          text: "#C2410C",
        },
        rose: {
          pale: "#FEE2E2",
          text: "#B91C1C",
        },
        slate: {
          pale: "#F3F4F6",
          text: "#4B5563",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(30,30,30,0.04), 0 12px 28px -14px rgba(30,30,30,0.16)",
      },
      borderRadius: {
        xl2: "1rem",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.35 },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
