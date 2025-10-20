/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  // más variables de entorno pueden ir aquí...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}