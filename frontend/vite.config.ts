import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    build: {
      // Configuración mínima para Vercel
      outDir: 'dist',
      sourcemap: false,
      minify: false, // Sin minificación para debug
    },
    server: {
      proxy: {
        // Proxy requests starting with /api to the backend dev server
        '/api': {
          target: env.VITE_BACKEND_URL || '/mypymegestion',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
      },
    },
  }
})
