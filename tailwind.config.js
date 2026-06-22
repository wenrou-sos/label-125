/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0F5C4E",
          50: "#E7ECEA",
          100: "#CFD9D5",
          200: "#B7CEC8",
          300: "#87ADA6",
          400: "#578D83",
          500: "#0F5C4E",
          600: "#0C493E",
          700: "#093730",
          800: "#062622",
          900: "#031411",
        },
        accent: {
          DEFAULT: "#D97706",
          light: "#F59E0B",
          dark: "#B45309",
        },
        ink: {
          DEFAULT: "#1F2A26",
          soft: "#3A4A44",
          mute: "#6B7A74",
        },
        canvas: {
          DEFAULT: "#F6F4EE",
          card: "#FFFFFF",
          sunken: "#EFEBE1",
        },
      },
      fontFamily: {
        sans: ["'PingFang SC'", "'Microsoft YaHei'", "system-ui", "sans-serif"],
        display: ["'Smiley Sans'", "'PingFang SC'", "'Microsoft YaHei'", "sans-serif"],
        num: ["'Bahnschrift'", "'DIN Alternate'", "'Helvetica Neue'", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,92,78,0.04), 0 8px 24px -12px rgba(15,92,78,0.12)",
        soft: "0 2px 8px -2px rgba(15,92,78,0.10)",
      },
    },
  },
  plugins: [],
};
