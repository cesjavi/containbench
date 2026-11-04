import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the dev server adds the backend API key, so it never ends up in the bundle.
// Set CONTAINBENCH_API_KEY to the same value as the backend's API_KEY (leave both empty to disable).
const apiKey = process.env.CONTAINBENCH_API_KEY ?? '';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        headers: apiKey ? { 'X-API-Key': apiKey } : {}
      }
    }
  }
});
