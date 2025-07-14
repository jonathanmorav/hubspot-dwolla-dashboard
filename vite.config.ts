import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Disable module preloading for service workers
        manualChunks: undefined,
      }
    },
    // Additional build options for service worker compatibility
    modulePreload: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  },
  worker: {
    format: 'iife',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
      }
    }
  },
  optimizeDeps: {
    exclude: ['./src/background/service-worker-static.ts']
  }
})