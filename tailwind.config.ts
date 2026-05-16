import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
      },
      colors: {
        ink: "#1a1a1a",
        paper: "#f5f2eb",
        accent: "#8a1c1c",
      },
    },
  },
  plugins: [],
};

export default config;
