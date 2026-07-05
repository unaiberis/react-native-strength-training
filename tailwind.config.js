/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          50: "#F4F4F2",
          100: "#E8E8E4",
          200: "#D0D0CC",
          300: "#B9B9B6",
          400: "#A4A4A8",
          500: "#707074",
          600: "#525258",
          700: "#343437",
          800: "#222225",
          900: "#171719",
          950: "#050505",
        },
        brand: {
          50: "#F4F4F2",
          100: "#E8E8E4",
          200: "#D0D0CC",
          300: "#B9B9B6",
          400: "#A4A4A8",
          500: "#707074",
          600: "#525258",
          700: "#343437",
          800: "#222225",
          900: "#171719",
          950: "#050505",
        },
        bg: {
          DEFAULT: "#050505",
          soft: "#0B0B0C",
        },
        card: {
          DEFAULT: "#171719",
          soft: "#222225",
        },
        border: "#343437",
        danger: {
          DEFAULT: "#D65F5F",
        },
      },
      borderRadius: {
        xl: "18px",
        "2xl": "26px",
      },
      fontFamily: {
        mono: undefined, // mantener default
      },
    },
  },
};
