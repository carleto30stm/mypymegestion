# Dockerfile para el backend
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Instalar dependencias de desarrollo y compilar
RUN npm install --include=dev && npm run build

# Remover dependencias de desarrollo
RUN npm prune --production

# Exponer puerto
EXPOSE 3001

# Comando de inicio
CMD ["npm", "start"]