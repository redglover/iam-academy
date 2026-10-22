/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        fog: v('fog'),
        paper: v('paper'),
        ink: v('ink'),
        muted: v('muted'),
        line: v('line'),
        key: v('key'),
        join: v('join'),
        move: v('move'),
        leave: v('leave'),
        auto: v('auto'),
        on: v('on'),
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { badge: '1.25rem' },
      boxShadow: {
        badge: '0 1px 0 rgb(var(--ink) / .06), 0 18px 40px -18px rgb(var(--key) / .45)',
        lift: '0 2px 0 rgb(var(--ink) / .9)',
      },
    },
  },
  plugins: [],
}
