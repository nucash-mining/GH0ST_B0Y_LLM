/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ghost: {
          black: '#050508',
          darker: '#0a0a0f',
          dark: '#0f0f1a',
          card: '#13131f',
          border: '#1e1e32',
          cyan: '#00f5ff',
          purple: '#7b2fff',
          green: '#00ff88',
          red: '#ff3366',
          muted: '#4a4a6a',
          text: '#c8c8e0',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'flicker': 'flicker 4s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px #00f5ff40, 0 0 10px #00f5ff20' },
          '50%': { boxShadow: '0 0 20px #00f5ff80, 0 0 40px #00f5ff40' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.8' },
          '94%': { opacity: '1' },
          '96%': { opacity: '0.9' },
          '97%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)`,
        'radial-ghost': 'radial-gradient(ellipse at center, #7b2fff10 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
};
