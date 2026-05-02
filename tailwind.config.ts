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
        void: '#07080B',
        carbon: '#0D0F14',
        asphalt: '#13161C',
        steel: '#1C2029',
        slate: '#252B37',
        blue: {
          DEFAULT: '#0EA5E9',
          dim: '#0284C7',
          tint: 'rgba(14, 165, 233, 0.08)',
        },
        cream: '#EDE8DC',
        silver: '#9DA8B7',
        pewter: '#5C6478',
        muted: '#353D4C',
        positive: '#3DB87A',
        warning: '#D4922A',
        negative: '#C94040',
      },
      fontFamily: {
        syne: ['var(--font-syne)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
