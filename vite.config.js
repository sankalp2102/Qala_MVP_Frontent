import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
