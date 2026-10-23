import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
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
        surface: "rgb(var(--color-surface-rgb) / <alpha-value>)",
        muted: "rgb(var(--color-muted-rgb) / <alpha-value>)",
        line: "rgb(var(--color-line-rgb) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--color-brand-rgb) / <alpha-value>)",
          dark: "rgb(var(--color-brand-dark-rgb) / <alpha-value>)",
          soft: "rgb(var(--color-brand-soft-rgb) / <alpha-value>)",
        },
        forest: {
          DEFAULT: "rgb(var(--color-forest-rgb) / <alpha-value>)",
          light: "rgb(var(--color-forest-light-rgb) / <alpha-value>)",
          soft: "rgb(var(--color-forest-soft-rgb) / <alpha-value>)",
        },
        sand: "rgb(var(--color-sand-rgb) / <alpha-value>)",
        gold: "rgb(var(--color-gold-rgb) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        soft: "0 24px 60px -28px rgba(43, 31, 22, 0.32)",
        card: "0 10px 32px -18px rgba(43, 31, 22, 0.24)",
        lift: "0 30px 80px -34px rgba(23, 63, 50, 0.46)",
        glow: "0 18px 44px -18px rgba(196, 81, 44, 0.65)",
        inset: "inset 0 1px 0 rgba(255,255,255,.65)",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(28px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "progress-in": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "slide-up": "slide-up .36s cubic-bezier(.2,.8,.2,1)",
        "fade-in": "fade-in .25s ease-out",
        "fade-up": "fade-up .5s cubic-bezier(.2,.8,.2,1) both",
        "scale-in": "scale-in .3s cubic-bezier(.2,.8,.2,1) both",
        shimmer: "shimmer 1.6s linear infinite",
        float: "float 5s ease-in-out infinite",
        "pulse-soft": "pulseSoft 1.8s ease-in-out infinite",
        "progress-in": "progress-in .7s cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
