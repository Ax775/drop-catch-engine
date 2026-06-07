import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Modern sleek dark — neutral near-black, refined violet accent.
        canvas: '#0a0a0b', // page background
        surface: {
          DEFAULT: '#141416', // cards / panels
          raised: '#1a1a1d', // inputs / insets
          hover: '#212126', // hover / active fills
        },
        line: {
          DEFAULT: 'rgba(255,255,255,0.08)', // hairline borders
          strong: 'rgba(255,255,255,0.14)',
        },
        content: {
          DEFAULT: '#ededef', // primary text
          muted: '#9b9ba6', // secondary text
          subtle: '#6c6c77', // tertiary / captions
        },
        accent: {
          DEFAULT: '#7c6cff', // violet
          hover: '#8f80ff',
          soft: 'rgba(124,108,255,0.14)',
          ink: '#ffffff',
        },
        positive: { DEFAULT: '#3fb950', soft: 'rgba(63,185,80,0.14)' },
        negative: { DEFAULT: '#f85149', soft: 'rgba(248,81,73,0.14)' },
        warn: { DEFAULT: '#d8a657', soft: 'rgba(216,166,87,0.14)' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0,0,0,0.4)',
        md: '0 8px 28px -8px rgba(0,0,0,0.55)',
        lg: '0 24px 64px -16px rgba(0,0,0,0.7)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'scale-in': 'scale-in 0.16s cubic-bezier(0.16,1,0.3,1)',
        'toast-in': 'toast-in 0.22s cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
