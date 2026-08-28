import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        /* Paleta "Grafito y Champagne": acentos y colores semánticos */
        champagne: "hsl(var(--champagne))",
        seguimiento: "hsl(var(--seguimiento))",
        exito: "hsl(var(--exito))",
        alerta: "hsl(var(--alerta))",
        "estado-pendiente": {
          DEFAULT: "hsl(var(--estado-pendiente))",
          fg: "hsl(var(--estado-pendiente-fg))",
          suave: "hsl(var(--estado-pendiente-suave))",
          borde: "hsl(var(--estado-pendiente-borde))",
        },
        "estado-platicas": {
          DEFAULT: "hsl(var(--estado-platicas))",
          fg: "hsl(var(--estado-platicas-fg))",
          suave: "hsl(var(--estado-platicas-suave))",
          borde: "hsl(var(--estado-platicas-borde))",
        },
        "estado-avance": {
          DEFAULT: "hsl(var(--estado-avance))",
          fg: "hsl(var(--estado-avance-fg))",
          suave: "hsl(var(--estado-avance-suave))",
          borde: "hsl(var(--estado-avance-borde))",
        },
        "estado-futura": {
          DEFAULT: "hsl(var(--estado-futura))",
          fg: "hsl(var(--estado-futura-fg))",
          suave: "hsl(var(--estado-futura-suave))",
          borde: "hsl(var(--estado-futura-borde))",
        },
        "estado-ganada": {
          DEFAULT: "hsl(var(--estado-ganada))",
          fg: "hsl(var(--estado-ganada-fg))",
        },
        "estado-perdida": {
          DEFAULT: "hsl(var(--estado-perdida))",
          fg: "hsl(var(--estado-perdida-fg))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        /* Sombras muy discretas, tintadas con grafito */
        card: "0 1px 2px 0 rgb(45 49 56 / 0.04), 0 1px 2px 0 rgb(45 49 56 / 0.05)",
        "card-hover": "0 3px 10px -3px rgb(45 49 56 / 0.10)",
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
};

export default config;
