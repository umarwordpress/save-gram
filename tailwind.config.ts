import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0f1222",
          soft: "#3b4060",
          muted: "#6b7191",
        },
        brand: {
          50: "#eef3ff",
          100: "#dbe5ff",
          300: "#9db4ff",
          500: "#4361ee",
          600: "#3449c8",
          700: "#2a3aa0",
        },
        surface: {
          DEFAULT: "#ffffff",
          sunken: "#f6f7fb",
          border: "#e5e7f0",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
