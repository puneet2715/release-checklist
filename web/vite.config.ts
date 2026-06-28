import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, the SPA runs on :5173 and proxies /api to the Express server on :4000,
// so the browser only ever talks to one origin (no CORS headaches locally).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  preview: {
    port: 5173,
  },
});
