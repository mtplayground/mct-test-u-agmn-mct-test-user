import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    allowedHosts: ['mct-test-u-agmn-mct-test-user-6c4754-bp4af.sprites.app'],
  },
});
