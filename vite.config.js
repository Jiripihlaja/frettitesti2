import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Kehityksessä /api-kutsut menevät `npm start` -palvelimelle (portti 3000).
    proxy: { '/api': 'http://localhost:3000' },
  },
});
