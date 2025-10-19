# 🚀 Guía de Despliegue - myGestor

## Stack de Despliegue

- **Frontend**: Vercel (React/Vite)
- **Backend**: Render (Node.js/Express)
- **Base de datos**: MongoDB Atlas

---

## 📋 Prerequisitos

1. Cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Cuenta en [Render](https://render.com)
3. Cuenta en [Vercel](https://vercel.com)
4. Repositorio en GitHub con el código

---

## 🗄️ Paso 1: Configurar MongoDB Atlas

### 1.1 Crear Cluster
1. Crear cuenta en MongoDB Atlas
2. Crear un nuevo cluster (M0 Free Tier)
3. Configurar usuario de base de datos
4. Agregar IP address (0.0.0.0/0 para permitir todas las IPs)

### 1.2 Obtener Connection String
1. Ir a "Connect" en tu cluster
2. Seleccionar "Connect your application"
3. Copiar el connection string
4. Reemplazar `<username>` y `<password>` con tus credenciales

**Ejemplo de Connection String:**
```
mongodb+srv://username:password@cluster0.abcdef.mongodb.net/mygestor?retryWrites=true&w=majority
```

---

## 🖥️ Paso 2: Desplegar Backend en Render

### 2.1 Preparar Repositorio
1. Subir código a GitHub
2. Asegurar que el `backend/` esté en la raíz o como subcarpeta

### 2.2 Crear Web Service en Render
1. Ir a [Render Dashboard](https://dashboard.render.com)
2. Conectar tu repositorio de GitHub
3. Crear nuevo "Web Service"
4. Configurar:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

### 2.3 Variables de Entorno en Render
```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster0.abcdef.mongodb.net/mygestor?retryWrites=true&w=majority
JWT_SECRET=tu_jwt_secret_super_seguro_de_minimo_32_caracteres
CORS_ORIGIN=https://tu-app.vercel.app
```

### 2.4 Desplegar
1. Hacer clic en "Create Web Service"
2. Esperar a que termine el build
3. Tomar nota de la URL: `https://tu-app.onrender.com`

---

## 🌐 Paso 3: Desplegar Frontend en Vercel

### 3.1 Crear .env.local
En el directorio `frontend/`, crear `.env.local`:
```bash
VITE_API_URL=https://tu-app.onrender.com
```

### 3.2 Desplegar en Vercel
1. Ir a [Vercel Dashboard](https://vercel.com/dashboard)
2. Importar proyecto desde GitHub
3. Configurar:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.3 Variables de Entorno en Vercel
En el dashboard de Vercel:
1. Ir a Settings > Environment Variables
2. Agregar:
   ```
   VITE_API_URL = https://tu-app.onrender.com
   ```

### 3.4 Desplegar
1. Hacer clic en "Deploy"
2. Tomar nota de la URL: `https://tu-app.vercel.app`

---

## 🔄 Paso 4: Actualizar CORS en Backend

1. Ir al dashboard de Render
2. Actualizar la variable `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://tu-app.vercel.app
   ```
3. El servicio se redesplegará automáticamente

---

## ✅ Paso 5: Verificar Despliegue

### 5.1 Verificar Backend
- Visitar: `https://tu-app.onrender.com/health`
- Debería devolver: `{"status":"OK","timestamp":"...","environment":"production"}`

### 5.2 Verificar Frontend
- Visitar: `https://tu-app.vercel.app`
- Intentar hacer login con: `admin` / `password`

### 5.3 Verificar Base de Datos
- En MongoDB Atlas, ir a "Browse Collections"
- Debería ver la colección `users` con el usuario admin

---

## 🔧 Comandos Útiles

### Desarrollo Local
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend  
cd frontend
npm install
npm run dev
```

### Build de Producción
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

---

## 🐛 Troubleshooting

### Error de CORS
- Verificar que `CORS_ORIGIN` en Render apunte a la URL de Vercel
- Verificar que `VITE_API_URL` en Vercel apunte a la URL de Render

### Error de Base de Datos
- Verificar connection string en MongoDB Atlas
- Verificar que la IP esté permitida (0.0.0.0/0)
- Verificar usuario y contraseña

### Error de Autenticación
- Verificar que `JWT_SECRET` esté configurado en Render
- Verificar que tenga al menos 32 caracteres

---

## 📞 Soporte

Si tienes problemas, revisar:
1. Logs en Render Dashboard
2. Console del navegador para errores de frontend
3. Variables de entorno configuradas correctamente