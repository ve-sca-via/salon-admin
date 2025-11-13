/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          black: "#000000",
          white: "#FFFFFF",
        },
        accent: {
          orange: "#F89C02",
          blue: "#3B82F6",
          green: "#10B981",
          red: "#EF4444",
        },
        neutral: {
          white: "#FFFFFF",
          gray: {
            900: "#111827",
            800: "#1F2937",
            700: "#374151",
            600: "#4B5563",
            500: "#6B7280",
            400: "#9CA3AF",
            300: "#D1D5DB",
            200: "#E5E7EB",
            100: "#F3F4F6",
            50: "#F9FAFB",
          },
          black: "#000000",
        },
        bg: {
          primary: "#FFFFFF",
          secondary: "#F5F8FE",
          tertiary: "#CEE0F6",
          dark: "#111827",
          darkSecondary: "#1F2937",
        },
      },
      fontFamily: {
        display: ["Marcellus", "serif"],
        body: ["DM Sans", "sans-serif"],
        accent: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
