import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],
          utils: ['axios']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    assetsInlineLimit: 4096
  },
  modulePreload: {
    polyfill: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0',
    port: process.env.VITE_PORT || 5173,
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            if (req.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
              proxyRes.headers['Cache-Control'] = 'public, max-age=31536000'
              proxyRes.headers['Expires'] = new Date(Date.now() + 31536000000).toUTCString()
            }
          })
        }
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.VITE_PORT || 5173,
    strictPort: false,
    cors: true,
    allowedHosts: ['all', 'localhost', '0.0.0.0', '127.0.0.1'],
    hmr: false
  }
})
