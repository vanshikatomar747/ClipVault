/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cv-sage': '#A8C3A0',
        'cv-beige': '#F5F1E8',
        'cv-cream': '#FFF8EC',
        'cv-olive': '#7E9D76',
        'cv-brown': '#A88B73',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
