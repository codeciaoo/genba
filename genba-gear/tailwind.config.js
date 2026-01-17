/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // プライマリ: 工具のティールグリーン（マキタを想起）
        primary: {
          DEFAULT: '#147878',
          light: '#1a9e9e',
          dark: '#0d5454',
        },
        teal: {
          DEFAULT: '#147878',
          light: '#1a9696',
          dark: '#0f5c5c',
          50: '#e6f5f5',
          100: '#b3e0e0',
          200: '#80cbcb',
          300: '#4db6b6',
          400: '#26a3a3',
          500: '#147878',
          600: '#105e5e',
          700: '#0d4a4a',
          800: '#093636',
          900: '#062222',
        },
        // ベース: 深いネイビー（HiKOKIを想起）
        navy: {
          DEFAULT: '#1a1f3d',
          light: '#2a3050',
          dark: '#12152b',
        },
        // アクセント: 安全イエロー
        safety: {
          DEFAULT: '#f5a623',
          light: '#ffc107',
          dark: '#c77700',
        },
        // 背景色
        background: '#f5f5f5',
        surface: '#ffffff',
        // ステータスカラー
        success: '#2d8a4e',
        warning: '#c77700',
        error: '#c73b3b',
      },
      fontFamily: {
        sans: ['NotoSansJP', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
