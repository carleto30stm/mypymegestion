# Backend - Gestor Gastos

Rápido setup:

1. Copia `.env.example` a `.env` y ajusta `MONGO_URI` y `PORT`:

   - En PowerShell:

     cp .env.example .env

   - Edita `.env` y pon tu URI de MongoDB.

2. Instala dependencias:

   npm install

3. Ejecuta en desarrollo (usa ts-node/esm loader configurado en `package.json`):

   npm run dev

4. Si prefieres compilar y correr en JS:

   npm run build
   npm start

Notas:
- Para desarrollo rápido, el sistema usa un "token" simple: el id del usuario. No es seguro para producción.
- Asegúrate de tener MongoDB corriendo y que `MONGO_URI` esté bien formado.
