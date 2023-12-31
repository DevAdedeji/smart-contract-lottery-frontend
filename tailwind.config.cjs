/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    screens: {
      xs: "475px",
      sm: "640px",
      md: "768px",
      lg: "1200px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        green: "#3DA764",
        grey: "#F9F9F9",
        "grey-2": "#F2F3F2",
        primary: "#164081",
      },
    },
  },
  plugins: [],
};
