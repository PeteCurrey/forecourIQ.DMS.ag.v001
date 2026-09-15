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
        // Design System — Electric Blue & Dark-First Palette
        primary: {
          DEFAULT: 'var(--color-primary)',
          dim: 'var(--color-primary-dim)',
          glow: 'var(--color-primary-glow)',
        },
        'bg-canvas': 'var(--color-bg-canvas)',
        'bg-surface': {
          DEFAULT: 'var(--color-bg-surface)',
          raised: 'var(--color-bg-surface-raised)',
        },
        // Direct surface shorthands
        canvas: 'var(--color-bg-canvas)',
        surface: {
          DEFAULT: 'var(--color-bg-surface)',
          raised: 'var(--color-bg-surface-raised)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        // Status Indicators
        status: {
          success: 'var(--color-status-success)',
          warning: 'var(--color-status-warning)',
          danger: 'var(--color-status-danger)',
          info: 'var(--color-status-info)',
        },
        success: 'var(--color-status-success)',
        danger: 'var(--color-status-danger)',
        info: 'var(--color-status-info)',

        // Backward compatibility mappings
        void: 'var(--void)',
        carbon: 'var(--carbon)',
        graphite: 'var(--asphalt)',
        asphalt: 'var(--asphalt)',
        steel: 'var(--steel)',
        slate: 'var(--slate)',
        sidebar: 'var(--sidebar)',
        blue: {
          DEFAULT: 'var(--blue)',
          dim: 'var(--blue-dim)',
          tint: 'var(--blue-tint)',
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
        sans: ['Lufga', 'General Sans', 'Inter', 'var(--font-sans)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        lufga: ['Lufga', 'General Sans', 'Inter', 'system-ui', 'sans-serif'],
        'general-sans': ['General Sans', 'Inter', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        syne: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Menlo', 'monospace'],
        'mono-vrm': ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '700' }],
        'h1': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.025em', fontWeight: '600' }],
        'h2': ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '600' }],
        'h3': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '600' }],
        'h4': ['1.125rem', { lineHeight: '1.35', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.5', letterSpacing: '-0.01em', fontWeight: '400' }],
        'body': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'caption': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        'mono-vrm': ['0.875rem', { lineHeight: '1.25', letterSpacing: '0.08em', fontWeight: '700' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      boxShadow: {
        'glow-primary': '0 8px 32px -8px rgba(0, 71, 255, 0.28), 0 2px 8px rgba(0, 0, 0, 0.4)',
        'glass-card': '0 10px 30px -10px rgba(0, 71, 255, 0.16), 0 4px 12px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'breathing': 'breathingMotion 9s ease-in-out infinite',
        'ambient-drift': 'ambientDrift 20s ease-in-out infinite alternate',
      },
      keyframes: {
        breathingMotion: {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.015) translateY(-4px)' },
        },
        ambientDrift: {
          '0%': { transform: 'translate(0%, 0%) scale(1)', opacity: '0.14' },
          '50%': { transform: 'translate(25%, 20%) scale(1.15)', opacity: '0.24' },
          '100%': { transform: 'translate(-20%, 15%) scale(0.95)', opacity: '0.16' },
        },
      },
    },
  },
  plugins: [
    typography,
  ],
};
export default config;
