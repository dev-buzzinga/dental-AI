/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6f2ac3",
        "primary-light": "#EDE9FE",
        "primary-dark": "#5B21B6",
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
      fontFamily: {
        sans: ["Noto Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}

