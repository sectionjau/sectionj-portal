import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Literata"', "Georgia", "serif"],
        sans: ['-apple-system', "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
      },
      colors: {
        sj: {
          bg: "#ffffff",
          fg: "#111111",
          muted: "#6b6b6b",
          line: "#e5e5e5",
          surface: "#f7f7f5",
        },
      },
      letterSpacing: {
        eyebrow: "0.22em",
      },
    },
  },
  plugins: [],
};

export default config;
