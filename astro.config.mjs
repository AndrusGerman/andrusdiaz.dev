// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://andrusdiaz.dev',
  integrations: [tailwind(), sitemap()],
  devToolbar: { enabled: false },
  vite: {
    optimizeDeps: {
      disabled: true,
      include: [],
      noDiscovery: true,
    },
  },
});
