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
        background: "#f4efe2",
        foreground: "#272117",
        neon: "#d94d2f",
        "neon-hover": "#b73922",
        surface: "#fffaf0",
        "surface-highlight": "#ebe0ca",
        border: "#d8c9ad",
        "border-visible": "#2a251e",
        charcoal: "#14100a",
        "nd-black": "#f4efe2",
        "nd-surface": "#fffaf0",
        "nd-surface-raised": "#ebe0ca",
        "nd-border": "#d8c9ad",
        "nd-border-visible": "#2a251e",
        "nd-text-disabled": "#8c8069",
        "nd-text-secondary": "#605641",
        "nd-text-primary": "#272117",
        "nd-text-display": "#14100a",
        "nd-accent": "#d94d2f",
        "nd-success": "#617645",
        "nd-warning": "#b8872b",
        "nd-interactive": "#147f94",
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"DM Sans"', 'system-ui', 'sans-serif'],
        body: ['"Space Grotesk"', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', '"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "4px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
        full: "9999px",
      },
      letterSpacing: {
        'label': '0.08em',
        'label-tight': '0.06em',
      },
    },
  },
  plugins: [],
};
export default config;
