/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./features/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        oboon: {
          page: "var(--oboon-bg-page)",
          surface: "var(--oboon-bg-surface)",
          subtle: "var(--oboon-bg-subtle)",

          title: "var(--oboon-text-title)",
          body: "var(--oboon-text-body)",
          muted: "var(--oboon-text-muted)",

          primary: "var(--oboon-primary)",
          "primary-hover": "var(--oboon-primary-hover)",

          border: "var(--oboon-border-default)",
        },
      },
      boxShadow: {
        card: "var(--oboon-shadow-card)",
      },
    },
  },
  plugins: [],
};
