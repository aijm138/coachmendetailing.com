/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Kanagawa (dragon-inspired) palette
        kano: {
          bg: '#1F1F28', // sumiInk1 - default background
          bgAlt: '#16161D', // sumiInk0 - darker alt
          fg: '#DCD7BA', // fujiWhite - default foreground
          fgDim: '#C8C093', // oldWhite / dimmed
          gray: '#727169', // fujiGray
          border: '#2A2A37', // sumiInk2
          overlay: 'rgba(0,0,0,0.5)',
          gold: '#E6C384', // carpYellow (accent)
          orange: '#FF9E3B', // roninYellow (warning/accent)
          blue: '#7E9CD8', // crystalBlue
          aqua: '#7AA89F', // waveAqua2
          green: '#98BB6C', // springGreen
          red: '#E46876', // waveRed
          violet: '#957FB8', // oniViolet
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial',
          'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'
        ],
      },
    },
  },
  plugins: [],
};
