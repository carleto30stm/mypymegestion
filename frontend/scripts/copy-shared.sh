#!/bin/bash
# Script para copiar el paquete shared al frontend antes del build
# Usado en Railway deployment

echo "📦 Copiando paquete shared al frontend..."

# Crear directorio shared en frontend si no existe
mkdir -p shared

# Copiar archivos del paquete shared
cp -r ../shared/src ./shared/
cp ../shared/package.json ./shared/
cp ../shared/tsconfig.json ./shared/

echo "✅ Paquete shared copiado exitosamente"

# Instalar dependencias del paquete shared
cd shared
npm install
npm run build
cd ..

echo "✅ Paquete shared compilado"
