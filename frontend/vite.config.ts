import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime — keep tiny, loaded first
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
          // Icon library — only loaded once, don't inline into each page
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // State management
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }
          // PDF generation \u2014 very heavy, should only load when user generates a report
          if (id.includes('jspdf') || id.includes('pdfmake') || id.includes('html2pdf') || id.includes('html2canvas')) {
            return 'vendor-pdf';
          }
          // Chart libraries
          if (id.includes('recharts') || id.includes('chart.js') || id.includes('d3')) {
            return 'vendor-charts';
          }
          // Other large node_modules \u2014 group to avoid per-chunk duplication
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
});
