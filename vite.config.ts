import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    {
      name: 'copy-service-worker',
      apply: 'build',
      generateBundle() {
        const swSource = resolve(__dirname, 'public/service-worker.js');
        const swDest = resolve(__dirname, 'dist/service-worker.js');
        
        if (existsSync(swSource)) {
          const distDir = resolve(__dirname, 'dist');
          if (!existsSync(distDir)) {
            mkdirSync(distDir, { recursive: true });
          }
          
          copyFileSync(swSource, swDest);
          console.log('✅ Service Worker copied to dist/');
        } else {
          console.warn('⚠️ Service Worker not found at:', swSource);
        }
      }
    },
    {
      name: 'dev-server-sw',
      apply: 'serve',
      configResolved(config) {
        console.log('✅ Service Worker will be served from public/ directory');
      }
    }
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: 'localhost',  // ✅ Changed from 'true' to 'localhost'
    middlewareMode: false,
    headers: {
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  },
  preview: {
    port: 4173,
    host: 'localhost',  // ✅ Changed from 'true' to 'localhost'
    headers: {
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  },
  define: {
    global: 'globalThis',
  },
  esbuild: {
    target: 'es2020'
  }
});