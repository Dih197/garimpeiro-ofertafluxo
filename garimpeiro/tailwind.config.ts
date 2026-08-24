import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        shopee: {
          DEFAULT: "#ee4d2d",
          dark: "#d73211",
          light: "#fef3f0"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"]
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out both",
        "float-in": "floatIn 0.5s ease-out both",
        "scale-in": "scaleIn 0.3s ease-out both",
        "count-up": "countFade 0.6s ease-out both",
        "spin-slow": "spin 6s linear infinite"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        floatIn: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        countFade: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.95)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        }
      },
      boxShadow: {
        "glow-shopee": "0 0 30px rgba(238, 77, 45, 0.2)",
        "glow-emerald": "0 0 30px rgba(16, 185, 129, 0.15)",
        "glow-indigo": "0 0 30px rgba(99, 102, 241, 0.15)"
      }
    }
  },
  plugins: []
};

export default config;
