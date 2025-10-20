# Deployment en Railway

## Configuración paso a paso

### 1. Preparar el repositorio
```bash
git add .
git commit -m "Configuración para Railway"
git push origin main
```

### 2. Crear proyecto en Railway

1. Ve a [railway.app](https://railway.app) y crea una cuenta
2. Conecta tu cuenta de GitHub
3. Crea un nuevo proyecto y selecciona este repositorio

### 3. Configurar servicios

Railway detectará automáticamente que tienes dos servicios (backend y frontend) gracias a los archivos `nixpacks.toml`.

#### Servicio Backend:
- Railway detectará el directorio `backend/`
- Variables de entorno a configurar:
  ```
  NODE_ENV=production
  MONGODB_URI=mongodb+srv://mypimegestion_db_user:N5ZSxSYYZ471orcL@cluster0.lradeem.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
  MONGO_DB_NAME=caja
  MONGO_USER=CARLOS
  MONGO_PASSWORD=123456
  JWT_SECRET=pumancaomcaop19784
  ```

#### Servicio Frontend:
- Railway detectará el directorio `frontend/`
- Variables de entorno a configurar:
  ```
  VITE_BACKEND_URL=https://TU_BACKEND_URL.railway.app
  ```

### 4. Conectar los servicios

1. Despliega primero el backend
2. Copia la URL generada (ej: `https://backend-production-xxxx.railway.app`)
3. Configura la variable `VITE_BACKEND_URL` del frontend con esa URL
4. Despliega el frontend

### 5. Configurar dominio (opcional)

Railway te dará URLs como:
- Backend: `https://backend-production-xxxx.railway.app`
- Frontend: `https://frontend-production-yyyy.railway.app`

Puedes configurar dominios personalizados en la configuración del proyecto.

## Estructura del proyecto para Railway

```
myGestor/
├── railway.json          # Configuración global
├── .env.railway         # Variables de entorno de ejemplo
├── backend/
│   ├── nixpacks.toml    # Configuración de build para backend
│   ├── package.json
│   └── src/
└── frontend/
    ├── nixpacks.toml    # Configuración de build para frontend
    ├── package.json
    └── src/
```

## Variables de entorno importantes

### Backend
- `PORT`: Railway lo asigna automáticamente
- `NODE_ENV`: production
- `MONGODB_URI`: Tu string de conexión a MongoDB Atlas
- `JWT_SECRET`: Tu clave secreta para JWT

### Frontend
- `VITE_BACKEND_URL`: URL del backend desplegado en Railway

## Notas importantes

1. Railway usa Nixpacks para detectar y construir automáticamente tu aplicación
2. El puerto se asigna automáticamente via la variable `$PORT`
3. CORS está configurado para aceptar dominios de Railway (.railway.app)
4. El frontend se sirve usando `serve` para archivos estáticos
5. Ambos servicios tienen health checks configurados

## Troubleshooting

Si tienes problemas:
1. Revisa los logs en el dashboard de Railway
2. Asegúrate de que las variables de entorno estén configuradas
3. Verifica que la URL del backend esté correcta en el frontend
4. Comprueba que MongoDB Atlas esté accesible