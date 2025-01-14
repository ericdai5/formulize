/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter Tight", "sans-serif"],
      },
      zIndex: {
        1: "1",
        2: "2",
        51: "51",
        52: "52",
      },
    },
  },
  plugins: [],
};

export default config;
