import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    build: {
      // Configuraciones específicas para Vercel
      target: 'es2015', // Compatible con navegadores más antiguos
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false, // Desactivar sourcemaps para reducir tamaño
      minify: 'esbuild', // Usar esbuild para minificación (más rápido)
      rollupOptions: {
        output: {
          manualChunks: undefined, // No dividir en chunks automáticamente
        }
      }
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
