/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  safelist: [
    // Dynamic font-size classes for formula fontSize setting (0.5 to 1.0 em)
    "text-[0.5em]",
    "text-[0.6em]",
    "text-[0.7em]",
    "text-[0.8em]",
    "text-[0.9em]",
    "text-[1em]",
    "text-[1.0em]",
  ],
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
