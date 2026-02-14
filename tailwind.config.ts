import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#00d4ff",
        secondary: "#7f5cff",
        danger: "#ff3366",
        success: "#00ff88",
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'dot-pulse': 'dot-pulse 1.4s infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.3)' },
        },
        'scan': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(400px)' },
        },
        'dot-pulse': {
          '0%, 80%, 100%': { transform: 'scale(1)', opacity: '0.5' },
          '40%': { transform: 'scale(1.3)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
