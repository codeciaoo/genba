/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        genba: {
          teal: {
            900: '#0d4f4f',
            700: '#147878',
            500: '#1a9e9e',
            100: '#e0f5f5',
          },
          navy: {
            900: '#1a1f3d',
            700: '#2d3561',
            500: '#4a5286',
          },
          yellow: {
            500: '#f5c518',
            600: '#d4a817',
          },
          black: '#1a1a1a',
          gray: {
            700: '#4a4a4a',
            300: '#b8b8b8',
            100: '#f5f5f5',
          },
          white: '#fafafa',
          success: '#2d8a4e',
          warning: '#c77700',
          error: '#c73b3b',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'Hiragino Kaku Gothic ProN', 'Meiryo', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
