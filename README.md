# 💰 Gestor de Gastos

Sistema completo de gestión de gastos con autenticación por roles, exportación PDF y despliegue en la nube.

## 🚀 Stack Tecnológico

- **Frontend**: React + TypeScript + Material-UI + Redux Toolkit + Vite
- **Backend**: Node.js + Express + TypeScript + MongoDB + Mongoose
- **Autenticación**: JWT con sistema de roles (admin/oper_ad/oper)
- **Exportación**: PDF con jsPDF + autoTable
- **Deployment**: MongoDB Atlas + Render + Vercel

## ⚡ Características

### 🔐 Sistema de Autenticación
- Login seguro con JWT
- 3 tipos de usuarios: `admin`, `oper_ad`, `oper`
- Control de permisos por rol

### 💸 Gestión de Gastos
- Formulario dinámico con validación
- Campos entrada/salida mutuamente excluyentes
- SubRubro dinámico según Rubro seleccionado
- Fechas StandBy para control temporal

### 📊 Resumen Bancario
- Cálculos automáticos por banco
- Filtros por mes y totales
- Exportación PDF con formato profesional
- Control de acceso por permisos

### 🎨 Interfaz de Usuario
- Diseño responsivo con Material-UI
- Sidebar con navegación intuitiva
- Modales para formularios
- Tablas dinámicas con acciones

## 🛠️ Desarrollo Local

### Prerequisitos
- Node.js 18+
- MongoDB (local o Atlas)
- Git

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configurar variables de entorno
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Configurar URL del backend
npm run dev
```

## 🌐 Deployment

### Variables de Entorno Requeridas

**Backend (.env)**:
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=tu_jwt_secret_seguro
PORT=5000
NODE_ENV=production
```

**Frontend (.env)**:
```env
VITE_API_URL=https://tu-backend.render.com
```

### Stack de Deployment

1. **MongoDB Atlas**: Base de datos en la nube
2. **Render**: Backend API
3. **Vercel**: Frontend estático

Ver `DEPLOY_GUIDE.md` para instrucciones detalladas.

## 📁 Estructura del Proyecto

```
myGestor/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuración DB
│   │   ├── controllers/    # Lógica de negocio
│   │   ├── middleware/     # Autenticación/Autorización
│   │   ├── models/         # Modelos MongoDB
│   │   ├── routes/         # Rutas API
│   │   └── server.ts       # Punto de entrada
│   ├── package.json
│   ├── tsconfig.json
│   └── render.yaml         # Configuración Render
├── frontend/
│   ├── components/         # Componentes React
│   ├── pages/             # Páginas principales
│   ├── redux/             # Estado global
│   ├── services/          # API calls
│   ├── package.json
│   ├── vite.config.ts
│   └── vercel.json        # Configuración Vercel
└── README.md
```

## 🔒 Sistema de Permisos

| Rol | Crear | Leer | Editar | Eliminar | PDF | Usuarios |
|-----|-------|------|--------|----------|-----|----------|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `oper_ad` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `oper` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

Ver `PERMISOS_USUARIO.md` para detalles completos.

## 📄 Licencia

MIT License - ver archivo LICENSE para detalles.

## 👨‍💻 Desarrollo

Proyecto desarrollado con las mejores prácticas de:
- TypeScript estricto
- Validación de formularios
- Control de errores
- Seguridad JWT
- Deployment automatizado