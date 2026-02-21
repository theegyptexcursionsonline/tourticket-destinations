import type { Config } from "tailwindcss";
import scrollbarHide from "tailwind-scrollbar-hide";
import rtl from "tailwindcss-rtl";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)"],
        arabic: ["var(--font-almarai)"],
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [scrollbarHide, rtl],
};
export default config;