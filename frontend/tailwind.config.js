/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        keiba: {
          // legacy aliases kept for existing pages
          red: '#E5484D',
          green: '#1F8A4C',
          gold: '#F39C12',
          dark: '#0F1115',
          card: '#1A1D24',
          border: 'rgba(255,255,255,0.1)',
          // design tokens
          bg: '#0F1115',
          surface: '#1A1D24',
          accent: '#1F8A4C',
          honmei: '#E5484D',
          taikou: '#3E63DD',
          tanana: '#30A46C',
          renka: '#8B8D98',
          ana: '#8E4EC6',
        },
      },
      fontFamily: {
        sans: ['Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'sans-serif'],
      },
      fontSize: {
        title: ['20px', { lineHeight: '1.3' }],
        heading: ['17px', { lineHeight: '1.4' }],
        body: ['15px', { lineHeight: '1.6' }],
        caption: ['13px', { lineHeight: '1.5' }],
      },
    },
  },
  plugins: [],
}
