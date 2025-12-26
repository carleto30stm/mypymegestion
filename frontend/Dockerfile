# Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app

# 1. Copiar manifiestos de dependencias
COPY package.json ./
COPY package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# 2. Instalación limpia de dependencias (para Linux + Rollup binaries)
RUN rm -f package-lock.json
RUN npm install

# 3. Copiar código fuente
COPY shared ./shared
COPY frontend ./frontend

# 4. Construir Shared
WORKDIR /app/shared
RUN npm run build

# 5. Construir Frontend
WORKDIR /app/frontend
# Aumentar memoria para el build si es necesario
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Inyectar VITE_BACKEND_URL como variable de entorno durante el build
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

# 6. Servir (usando 'serve' que está en dependencias o npx)
EXPOSE 3000
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
