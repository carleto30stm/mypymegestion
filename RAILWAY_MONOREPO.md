# Railway Service Configuration
# Para monorepos, Railway necesita configuración manual

# Instrucciones actualizadas para Railway:

## Opción 1: Crear servicios manualmente

1. En lugar de usar "Deploy from GitHub repo" directamente
2. Usa "Empty Service" y configura manualmente:

### Backend Service:
- Service Name: `backend`
- Root Directory: `/backend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Port: Se detecta automáticamente

### Frontend Service:
- Service Name: `frontend`  
- Root Directory: `/frontend`
- Build Command: `npm ci && npm run build`
- Start Command: `npx serve -s dist -l $PORT`
- Port: Se detecta automáticamente

## Opción 2: Usar Railway CLI (Recomendado)

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Crear proyecto
railway project new

# Desplegar backend
cd backend
railway service new backend
railway up

# Desplegar frontend  
cd ../frontend
railway service new frontend
railway up
```

## Variables de entorno por servicio:

### Backend:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://mypimegestion_db_user:N5ZSxSYYZ471orcL@cluster0.lradeem.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
MONGO_DB_NAME=caja
MONGO_USER=CARLOS
MONGO_PASSWORD=123456
JWT_SECRET=pumancaomcaop19784
```

### Frontend:
```
VITE_BACKEND_URL=${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

Railway puede referenciar automáticamente la URL del backend usando `${{backend.RAILWAY_PUBLIC_DOMAIN}}`