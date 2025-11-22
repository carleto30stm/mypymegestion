# 🔧 Guía para Generar TA (Ticket de Acceso) en Ambiente Local

Esta guía te ayudará a generar el Ticket de Acceso (TA) de AFIP en tu entorno local de desarrollo.

## 📋 Prerrequisitos

### 1. Instalar OpenSSL (REQUERIDO)

El servicio WSAA de AFIP requiere OpenSSL para firmar el TRA (Ticket de Requerimiento de Acceso).

**Opción A: Usando Chocolatey (Recomendado)**
```powershell
# Ejecutar PowerShell como Administrador
choco install openssl -y
```

**Opción B: Descarga manual**
1. Ir a: https://slproweb.com/products/Win32OpenSSL.html
2. Descargar: **Win64 OpenSSL v3.x.x Light** (o Full)
3. Instalar con las opciones por defecto
4. Agregar a PATH: `C:\Program Files\OpenSSL-Win64\bin`

**Verificar instalación:**
```powershell
openssl version
# Debería mostrar: OpenSSL 3.x.x ...
```

### 2. Copiar Certificados desde Railway

Los certificados están en Railway pero no en local. Tienes dos opciones:

#### Opción A: Descargar desde Railway (Recomendado)

**Usando Railway CLI:**
```powershell
# Instalar Railway CLI si no lo tienes
npm install -g @railway/cli

# Login
railway login

# Vincular proyecto
railway link

# Descargar certificados
railway run 'cat certs/cert.crt' > backend/certs/cert.crt
railway run 'cat certs/private.key' > backend/certs/private.key
```

#### Opción B: Copiar manualmente desde Railway Dashboard

1. Ir a Railway Dashboard → Tu proyecto → Backend
2. Abrir Shell/Terminal
3. Ejecutar:
   ```bash
   cat certs/cert.crt
   cat certs/private.key
   ```
4. Copiar el contenido y crear los archivos en `backend/certs/`

### 3. Crear estructura de carpetas

```powershell
# Desde el directorio backend
cd backend
mkdir certs -Force
mkdir afip_tokens -Force
```

## 🚀 Generar el TA

Una vez instalado OpenSSL y copiados los certificados:

### Método 1: Usando el script existente

```powershell
cd backend
node scripts/obtener-ta-afip.js
```

### Método 2: Forzar regeneración del TA

Si ya existe un TA pero quieres generar uno nuevo:

```powershell
node scripts/obtener-ta-afip.js --force
```

## 📁 Estructura esperada

```
backend/
├── certs/
│   ├── cert.crt          ← Certificado AFIP (desde Railway)
│   └── private.key       ← Clave privada AFIP (desde Railway)
├── afip_tokens/
│   └── TA-wsfe.json     ← Se genera automáticamente
└── .env                  ← Configuración
```

## ✅ Verificación

Después de ejecutar el script, deberías ver:

```
✅ Ticket de Acceso (TA) obtenido exitosamente!

📋 Información del TA:
   Servicio: wsfe
   Destino: cn=wsfe, o=afip, c=ar, serialNumber=CUIT xxxxxxxx
   Generado: [fecha y hora]
   Expira: [fecha y hora + 12 horas]
   
💾 TA guardado en: ./afip_tokens/TA-wsfe.json
```

## 🔍 Solución de Problemas

### Error: "OpenSSL no reconocido"
- Reinstalar OpenSSL y verificar PATH
- Reiniciar PowerShell/VSCode después de instalar

### Error: "Certificado no encontrado"
```
Error: Certificado no encontrado: ./certs/cert.crt
```
**Solución:** Copiar certificados desde Railway (ver paso 2)

### Error: "400 Bad Request" o "500 Internal Server Error"
```
Error HTTP 400/500 al conectar con WSAA
```
**Posibles causas:**
1. Certificado no registrado en portal AFIP
2. CUIT no autorizado para el servicio wsfe
3. Certificado expirado o inválido
4. Ambiente incorrecto (prod vs homologación)

**Verificar en portal AFIP:**
- Homologación: https://auth.afip.gob.ar/contribuyente_/login.xhtml
- Administrador de relaciones → Certificados → wsfe

### Error: "SOAP Fault: alreadyAuthenticated"
```
AFIP ya generó un TA válido previamente
```
**Solución:** 
- Esperar 1 hora o eliminar el caché:
```powershell
rm backend/afip_tokens/TA-wsfe.json
node scripts/obtener-ta-afip.js
```

## 🔄 Flujo Automático

El servicio AFIP (`AFIPWSAAService`) automáticamente:
1. Verifica si existe un TA válido en caché
2. Si existe y no está por expirar (> 1 hora restante), lo reutiliza
3. Si no existe o está por expirar, genera uno nuevo
4. Guarda el nuevo TA en `afip_tokens/TA-wsfe.json`

**Duración del TA:** 12 horas desde su generación

## 📝 Variables de Entorno

Verificar en `.env`:

```env
# AFIP Configuration
AFIP_CUIT=27118154520               # Tu CUIT
AFIP_PRODUCTION=false               # true para producción
AFIP_CERT_PATH=./certs/cert.crt    # Ruta al certificado
AFIP_KEY_PATH=./certs/private.key  # Ruta a la clave privada
AFIP_TA_FOLDER=./afip_tokens       # Carpeta para TAs
AFIP_PUNTO_VENTA=2                 # Punto de venta
```

## 🔐 Seguridad

**⚠️ IMPORTANTE:**
- Los certificados (`.crt`, `.key`) son SECRETOS
- Los TA (`.json`) contienen tokens de acceso SENSIBLES
- **NO** commitear estos archivos a Git
- Verificar que estén en `.gitignore`:
  ```
  certs/*.crt
  certs/*.key
  afip_tokens/*.json
  ```

## 🎯 Comandos Rápidos

```powershell
# Instalar OpenSSL (como admin)
choco install openssl -y

# Crear carpetas
mkdir backend/certs -Force
mkdir backend/afip_tokens -Force

# Copiar certificados desde Railway (si tienes Railway CLI)
railway run 'cat certs/cert.crt' > backend/certs/cert.crt
railway run 'cat certs/private.key' > backend/certs/private.key

# Generar TA
cd backend
node scripts/obtener-ta-afip.js
```

## 📞 Soporte

Si continúas teniendo problemas:
1. Verificar logs detallados del script
2. Revisar configuración en portal AFIP
3. Verificar fechas de validez del certificado
4. Contactar soporte AFIP si es problema con el servicio

---

**Última actualización:** 22 de noviembre de 2025
