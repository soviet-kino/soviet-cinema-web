import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"PT Serif"', "Georgia", "Times New Roman", "serif"],
        display: ['"Playfair Display"', '"PT Serif"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        // Темнота зала перед сеансом.
        screen: "#0a0a0d",
        // Чуть светлее — поверхности карточек и панелей.
        velvet: "#15151a",
        // Бордовая обивка кресел — как акцент-разделитель.
        velvet_red: "#2a1518",
        // Выцветший белый старого экрана, читается как «свет от проектора».
        light: "#e8e3d3",
        // Приглушённое золото плёнки.
        sepia: "#c4933e",
        // Сепия светлее — для метаданных и hint'ов.
        sepia_dim: "#8a6a30",
        // Тёплый красный заставки, как «звезда» советского ТВ.
        signal: "#b03a32",
      },
      backgroundImage: {
        // Вертикальные «перфорации» по сторонам страницы — киноплёнка.
        perforations:
          "radial-gradient(circle at 14px 50%, #15151a 6px, transparent 6.5px), radial-gradient(circle at 14px 50%, #15151a 6px, transparent 6.5px)",
      },
      boxShadow: {
        "frame": "0 0 0 1px rgba(232, 227, 211, 0.08), 0 1px 0 0 rgba(0,0,0,0.6)",
        "screen": "0 0 120px 0 rgba(196, 147, 62, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
