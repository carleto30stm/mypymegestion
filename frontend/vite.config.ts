import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    base: '/',
    server: {
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    // Configuración para soportar paquete compartido CommonJS
    resolve: {
      preserveSymlinks: true,
    },
    build: {
      commonjsOptions: {
        include: [/shared/, /node_modules/],
      },
    },
    optimizeDeps: {
      include: ['@mygestor/shared'],
    },
  }
})