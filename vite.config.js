import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libs into separate chunk — cached separately by browser
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          // Split axios into own chunk
          'http': ['axios'],
        },
      },
    },
    // Increase warning threshold to avoid noise — actual split handles real size
    chunkSizeWarningLimit: 800,
  },
  server: {
    proxy: {
      '/auth': {
        target: 'https://api.qala.studio',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost'
      },
      '/api': {
        target: 'https://api.qala.studio',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost'
      }
    }
  }
})
