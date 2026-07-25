/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#060a14',
          800: '#0a0e1a',
          700: '#0e1422',
          600: '#141c2e',
          500: '#1c2640',
        },
        neon: {
          green: '#00ff88',
          'green-dim': '#00cc6a',
          'green-glow': 'rgba(0,255,136,0.15)',
        },
        cyber: {
          amber: '#ffb347',
          crimson: '#ff4444',
          blue: '#4488ff',
          purple: '#aa44ff',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 20px rgba(0,255,136,0.3), 0 0 60px rgba(0,255,136,0.1)',
        'neon-sm': '0 0 8px rgba(0,255,136,0.25)',
        glass: '0 8px 32px rgba(0,0,0,0.4)',
      },
      animation: {
        'cursor-blink': 'blink 1s step-end infinite',
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'count-up': 'countUp 0.5s ease-out',
        scanline: 'scanline 8s linear infinite',
      },
      keyframes: {
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
        'pulse-neon': {
          '0%,100%': { boxShadow: '0 0 20px rgba(0,255,136,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0,255,136,0.6), 0 0 80px rgba(0,255,136,0.2)' },
        },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        countUp: { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        scanline: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100vh' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
