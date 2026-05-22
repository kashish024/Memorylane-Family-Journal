/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#87C38F',
          light: '#B5E3B8',
          dark: '#6B9E6F',
        },
        secondary: {
          DEFAULT: '#E07A5F',
          light: '#F0B6A3',
          dark: '#C5604A',
        },
        accent: {
          DEFAULT: '#F2CC8F',
          light: '#F9E5C3',
          dark: '#D4A96F',
        },
        background: {
          DEFAULT: '#F8F9FA',
          card: '#FFFFFF',
        },
        text: {
          dark: '#2D3436',
          light: '#636E72',
          muted: '#95A5A6',
        },
      },
    },
  },
  plugins: [],
}