import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "rgb(var(--color-cream-rgb) / <alpha-value>)",
        ink: "rgb(var(--color-ink-rgb) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--color-brand-rgb) / <alpha-value>)",
          dark: "rgb(var(--color-brand-dark-rgb) / <alpha-value>)",
          soft: "rgb(var(--color-brand-soft-rgb) / <alpha-value>)",
        },
        forest: {
          DEFAULT: "rgb(var(--color-forest-rgb) / <alpha-value>)",
          light: "rgb(var(--color-forest-light-rgb) / <alpha-value>)",
        },
        sand: "rgb(var(--color-sand-rgb) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-rounded", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-rounded", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -18px rgba(49, 36, 24, 0.25)",
        card: "0 4px 18px -8px rgba(49, 36, 24, 0.18)",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(24px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "slide-up": "slide-up .28s cubic-bezier(.2,.8,.2,1)",
        "fade-in": "fade-in .2s ease-out",
        "pulse-soft": "pulseSoft 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
