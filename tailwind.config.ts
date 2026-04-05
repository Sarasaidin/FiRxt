import type { Config } from "tailwindcss";

const config: Config = {
  content: [
  "./app/**/*.{js,ts,jsx,tsx,mdx}",
  "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./components/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/**/*.{js,ts,jsx,tsx,mdx}",
],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#1B2B4B",
          green: "#4CAF50",
          "green-dark": "#2E7D32",
          red: "#C62828",
          teal: "#B2EBF2",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "teal-gradient": "linear-gradient(135deg, #ffffff 0%, #B2EBF2 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
