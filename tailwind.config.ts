import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--color-page)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        border: "var(--color-border)",
        "text-1": "var(--color-text-1)",
        "text-2": "var(--color-text-2)",
        "text-3": "var(--color-text-3)",
        primary: "var(--color-primary)",
        "on-primary": "var(--color-on-primary)",
        accent: "var(--color-accent)",
        "accent-bg": "var(--color-accent-bg)",
        "conf-high": "var(--color-conf-high)",
        "conf-high-bg": "var(--color-conf-high-bg)",
        "conf-high-glass": "var(--color-conf-high-glass)",
        "conf-medium": "var(--color-conf-medium)",
        "conf-medium-bg": "var(--color-conf-medium-bg)",
        "conf-medium-glass": "var(--color-conf-medium-glass)",
        "conf-low": "var(--color-conf-low)",
        "conf-low-bg": "var(--color-conf-low-bg)",
        "conf-low-glass": "var(--color-conf-low-glass)",
        review: "var(--color-review)",
        "review-bg": "var(--color-review-bg)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        button: "var(--radius-button)",
        pill: "var(--radius-pill)",
        sheet: "var(--radius-sheet)",
        phone: "var(--radius-phone)",
        bar: "var(--radius-bar)",
        rail: "var(--radius-rail)",
        "rail-item": "var(--radius-rail-item)",
        modal: "var(--radius-modal)",
        "icon-tile": "var(--radius-icon-tile)",
        "visitor-card": "var(--radius-visitor-card)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        float: "var(--shadow-float)",
        phone: "var(--shadow-phone)",
        sheet: "var(--shadow-sheet)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        visitor: ["var(--font-playfair)", "Playfair Display", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
