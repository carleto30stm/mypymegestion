#!/bin/bash

echo "🔍 Verificando preparación para despliegue..."

# Verificar estructura de archivos
echo "📁 Verificando estructura de archivos..."

# Backend
if [ ! -f "backend/package.json" ]; then
    echo "❌ backend/package.json no encontrado"
    exit 1
fi

if [ ! -f "backend/render.yaml" ]; then
    echo "❌ backend/render.yaml no encontrado"
    exit 1
fi

if [ ! -f "backend/.env.example" ]; then
    echo "❌ backend/.env.example no encontrado"
    exit 1
fi

# Frontend
if [ ! -f "frontend/package.json" ]; then
    echo "❌ frontend/package.json no encontrado"
    exit 1
fi

if [ ! -f "frontend/vercel.json" ]; then
    echo "❌ frontend/vercel.json no encontrado"
    exit 1
fi

if [ ! -f "frontend/.env.example" ]; then
    echo "❌ frontend/.env.example no encontrado"
    exit 1
fi

echo "✅ Estructura de archivos correcta"

# Verificar scripts de build
echo "🔨 Verificando scripts de build..."

cd backend
if ! grep -q '"build"' package.json; then
    echo "❌ Script 'build' no encontrado en backend/package.json"
    exit 1
fi

if ! grep -q '"start"' package.json; then
    echo "❌ Script 'start' no encontrado en backend/package.json"
    exit 1
fi

cd ../frontend
if ! grep -q '"build"' package.json; then
    echo "❌ Script 'build' no encontrado en frontend/package.json"
    exit 1
fi

echo "✅ Scripts de build encontrados"

# Intentar build local
echo "🏗️ Intentando build local..."

cd ../backend
echo "📦 Instalando dependencias del backend..."
if ! npm install; then
    echo "❌ Error instalando dependencias del backend"
    exit 1
fi

echo "🔨 Building backend..."
if ! npm run build; then
    echo "❌ Error en build del backend"
    exit 1
fi

cd ../frontend
echo "📦 Instalando dependencias del frontend..."
if ! npm install; then
    echo "❌ Error instalando dependencias del frontend"
    exit 1
fi

echo "🔨 Building frontend..."
if ! npm run build; then
    echo "❌ Error en build del frontend"
    exit 1
fi

echo ""
echo "🎉 ¡Preparación para despliegue completada exitosamente!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Subir código a GitHub"
echo "2. Configurar MongoDB Atlas"
echo "3. Desplegar backend en Render"
echo "4. Desplegar frontend en Vercel"
echo ""
echo "📖 Ver DEPLOY_GUIDE.md para instrucciones detalladas"