/** @type {import('tailwindcss').Config} */
/*
 * Los colores se resuelven desde variables CSS definidas en
 * src/styles/global.css — edita ese archivo para cambiar el tema.
 */
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        midnight: v('--midnight'),
        anthracite: v('--anthracite'),
        surface: v('--surface'),
        accent: {
          200: v('--accent-200'),
          300: v('--accent-300'),
          400: v('--accent-400'),
          500: v('--accent-500'),
          600: v('--accent-600'),
          700: v('--accent-700'),
        },
        /* Alias de producto → apuntan a la escala de acento */
        linco: v('--accent-300'),
        relay: v('--accent-400'),
        pabilo: v('--accent-500'),
        marketing: v('--accent-200'),
        magenta: v('--accent-600'),
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
