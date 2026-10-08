/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        page: 'var(--page)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        line: 'var(--border)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        primary: 'var(--primary)',
        'on-primary': 'var(--on-primary)',
        accent: 'var(--accent)',
        'accent-bg': 'var(--accent-bg)',
        'conf-high': 'var(--conf-high)',
        'conf-high-bg': 'var(--conf-high-bg)',
        'conf-medium': 'var(--conf-medium)',
        'conf-medium-bg': 'var(--conf-medium-bg)',
        'conf-low': 'var(--conf-low)',
        'conf-low-bg': 'var(--conf-low-bg)',
        review: 'var(--review)',
        'review-bg': 'var(--review-bg)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        sheet: '32px',
        phone: '32px',
      },
    },
  },
  plugins: [],
}
