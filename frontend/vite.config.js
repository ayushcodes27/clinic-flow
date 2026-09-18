import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const backendTarget = process.env.VITE_BACKEND_URL || (process.env.DOCKER_ENV ? 'http://clinicflow-app:8080' : 'http://localhost:8081');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true
      },
      '/ws': {
        target: backendTarget,
        ws: true,
        changeOrigin: true
      }
    }
  }
})
