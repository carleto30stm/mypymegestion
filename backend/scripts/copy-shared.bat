@echo off
REM Script para copiar el paquete shared al backend antes del build (Windows)
REM Usado en Railway deployment

echo Copiando paquete shared al backend...

REM Crear directorio shared en backend si no existe
if not exist "shared" mkdir shared

REM Copiar archivos del paquete shared
xcopy /E /I /Y "..\shared\src" "shared\src"
copy /Y "..\shared\package.json" "shared\"
copy /Y "..\shared\tsconfig.json" "shared\"

echo Paquete shared copiado exitosamente

REM Instalar dependencias del paquete shared
cd shared
call npm install
call npm run build
cd ..

echo Paquete shared compilado
