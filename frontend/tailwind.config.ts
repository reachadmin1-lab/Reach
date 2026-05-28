import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Reach design tokens
        brand: {
          DEFAULT: "#FF4118",
          warm: "#FF6A45",
          deep: "#C92D0B",
        },
        ink: {
          DEFAULT: "#0B0B0F",
        },
        paper: {
          DEFAULT: "#F7F4EE",
          2: "#EEEAE0",
        },
        line: "rgba(11,11,15,0.10)",
        green: {
          DEFAULT: "#1B9C5A",
        },
        amber: {
          DEFAULT: "#C68A12",
        },
        // Keep background/foreground for compatibility
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },
  plugins: [],
};
export default config;
