import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(158, 100%, 15%)",       // asosiy rangdan biroz ochroq
        input: "hsl(158, 100%, 10%)",        // asosiy rang
        ring: "hsl(158, 100%, 20%)",         // chuqurroq yashil
        background: "hsl(158, 50%, 95%)",    // juda och yashil fon
        foreground: "hsl(158, 100%, 10%)",   // asosiy matn rangi
        primary: {
          DEFAULT: "hsl(158, 100%, 10%)",    // asosiy rang
          foreground: "#ffffff",             // oq matn
        },
        secondary: {
          DEFAULT: "hsl(158, 100%, 20%)",    // qo‘shimcha chuqur yashil
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#7f1d1d",                // qizil (xatolik uchun)
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#e5e7eb",                // neytral kulrang
          foreground: "#374151",
        },
        accent: {
          DEFAULT: "hsl(158, 100%, 15%)",    // accent sifatida ochroq yashil
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "hsl(158, 100%, 10%)",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "hsl(158, 100%, 10%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
