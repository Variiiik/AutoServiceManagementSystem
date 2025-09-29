import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '192.168.2.10',
    port: 3000,
    strictPort: true
  },
  preview: {
    host: '192.168.2.10',
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});