import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: 'var(--void)',
        carbon: 'var(--carbon)',
        graphite: 'var(--asphalt)',
        asphalt: 'var(--asphalt)',
        steel: 'var(--steel)',
        slate: 'var(--slate)',
        sidebar: 'var(--sidebar)',
        blue: {
          DEFAULT: '#0EA5E9',
          dim: '#0284C7',
          tint: 'rgba(14, 165, 233, 0.08)',
        },
        cream: 'var(--cream)',
        silver: 'var(--silver)',
        pewter: 'var(--pewter)',
        muted: 'var(--muted)',
        divider: 'var(--steel)',
        positive: 'var(--positive)',
        warning: 'var(--warning)',
        negative: 'var(--negative)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        inter: ['var(--font-sans)', 'sans-serif'],
        syne: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '2px',
      },
    },
  },
  plugins: [
    typography,
  ],
};
export default config;
