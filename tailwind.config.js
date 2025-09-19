/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Post-Op Radar Brand Colors (from UI spec)
        alert: {
          red: '#E5484D',
          yellow: '#F1A10D',
          green: '#30A46C'
        },
        gray: {
          primary: '#11181C',
          secondary: '#687076'
        },
        blue: {
          accent: '#0F6FFF'
        },
        background: '#FCFCFD',
        'card-hover': '#F1F3F5'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'card-number': ['28px', '32px'],
        'table-body': ['15px', '20px'],
        'drawer-heading': ['18px', '24px']
      },
      boxShadow: {
        'focus-ring': '0 0 0 2px #0F6FFF',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}