# 🔐 Configuración de Certificados AFIP

Esta guía explica cómo configurar los certificados AFIP para desarrollo local y deployment en producción (Vercel/Railway).

---

## 📋 Índice

1. [Desarrollo Local](#desarrollo-local)
2. [Deployment en Vercel](#deployment-en-vercel)
3. [Deployment en Railway](#deployment-en-railway)
4. [Solución de Problemas](#solución-de-problemas)
5. [Seguridad](#seguridad)

---

## 🖥️ Desarrollo Local

### Opción 1: Certificados de Prueba (Recomendado para Testing)

Si NO tienes certificados AFIP o quieres probar la integración:

```bash
cd backend
npm run afip:generar-cert
```

Este comando:
- ✅ Crea `backend/certs/cert.crt` (certificado autofirmado)
- ✅ Crea `backend/certs/private.key` (clave privada)
- ✅ Son válidos SOLO para testing/homologación AFIP
- ⚠️ NO usar en producción con facturación real

### Opción 2: Certificados Oficiales AFIP

Si tienes certificados oficiales de AFIP:

1. **Copia los archivos** a `backend/certs/`:
   ```
   backend/
     └── certs/
         ├── cert.crt       ← Tu certificado AFIP
         └── private.key    ← Tu clave privada AFIP
   ```

2. **Verifica el `.env`**:
   ```bash
   AFIP_CERT_PATH=./certs/cert.crt
   AFIP_KEY_PATH=./certs/private.key
   ```

3. **Prueba la conexión**:
   ```bash
   npm run afip:verificar-cert
   ```

---

## ☁️ Deployment en Vercel

### Paso 1: Exportar Certificados

Desde la carpeta `backend`:

```bash
npm run afip:exportar-cert
```

Este comando muestra en consola:
- El contenido de `AFIP_CERT` (con `\n` escapados)
- El contenido de `AFIP_KEY` (con `\n` escapados)

### Paso 2: Configurar Variables de Entorno en Vercel

1. **Accede a tu proyecto** en [Vercel Dashboard](https://vercel.com/dashboard)

2. **Ve a Settings → Environment Variables**

3. **Agrega AFIP_CERT**:
   - Variable Name: `AFIP_CERT`
   - Value: Copia el contenido de `AFIP_CERT` del script (SIN las comillas externas)
   - Aplica a: `Production`, `Preview`, `Development`

4. **Agrega AFIP_KEY**:
   - Variable Name: `AFIP_KEY`
   - Value: Copia el contenido de `AFIP_KEY` del script (SIN las comillas externas)
   - Aplica a: `Production`, `Preview`, `Development`

5. **Agrega otras variables AFIP necesarias**:
   ```
   AFIP_CUIT=20123456789
   AFIP_PRODUCTION=false
   AFIP_PUNTO_VENTA=1
   ```

6. **Redeploy** el proyecto:
   - Vercel hace redeploy automático
   - O fuerza un redeploy desde Dashboard

### Paso 3: Verificar

Revisa los logs de deployment:
- ✅ Debe aparecer: "Usando certificados AFIP desde variables de entorno (Railway)"
- ❌ Si aparece error de módulo xml2js, asegúrate de que `xml2js` esté en `package.json`

---

## 🚂 Deployment en Railway

### Paso 1: Exportar Certificados

Desde la carpeta `backend`:

```bash
npm run afip:exportar-cert
```

### Paso 2: Configurar Variables en Railway

1. **Accede a tu proyecto** en [Railway Dashboard](https://railway.app/dashboard)

2. **Selecciona tu servicio** → Tab "Variables"

3. **Click en "New Variable"** y agrega:

   **AFIP_CERT**:
   - Variable: `AFIP_CERT`
   - Value: Copia el contenido del script (SIN las comillas externas)

   **AFIP_KEY**:
   - Variable: `AFIP_KEY`
   - Value: Copia el contenido del script (SIN las comillas externas)

4. **Agrega otras variables AFIP**:
   ```
   AFIP_CUIT=20123456789
   AFIP_PRODUCTION=false
   AFIP_PUNTO_VENTA=1
   ```

5. **Deploy automático**:
   - Railway hace redeploy automáticamente al detectar cambios

### Paso 3: Verificar

Revisa los logs del servicio:
- ✅ Debe aparecer: "Usando certificados AFIP desde variables de entorno (Railway)"

---

## 🔧 Solución de Problemas

### Error: "Cannot find module 'xml2js'"

**Causa**: Falta dependencia xml2js en package.json

**Solución**:
```bash
cd backend
npm install xml2js @types/xml2js
git add package.json package-lock.json
git commit -m "fix: agregar dependencia xml2js para servicios AFIP"
git push
```

### Error: "Certificado AFIP no encontrado"

**Desarrollo Local**:
```bash
npm run afip:generar-cert
```

**Vercel/Railway**:
- Verifica que las variables `AFIP_CERT` y `AFIP_KEY` estén configuradas
- Verifica que copiaste TODO el contenido (incluyendo BEGIN/END)

### Error: "Invalid certificate format"

**Causa**: Certificado no tiene formato PEM válido

**Verificar**:
```bash
npm run afip:verificar-cert
```

**Solución**:
- El certificado debe empezar con `-----BEGIN CERTIFICATE-----`
- Y terminar con `-----END CERTIFICATE-----`
- La clave debe empezar con `-----BEGIN RSA PRIVATE KEY-----` o `-----BEGIN PRIVATE KEY-----`

### Saltos de línea en variables de entorno

**Correcto** (con `\n` escapados):
```
AFIP_CERT="-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----"
```

**Incorrecto** (saltos reales):
```
AFIP_CERT="-----BEGIN CERTIFICATE-----
MIID...
-----END CERTIFICATE-----"
```

El script `npm run afip:exportar-cert` ya hace el escape automáticamente.

---

## 🔒 Seguridad

### ⚠️ NUNCA hacer commit de certificados

Los certificados están en `.gitignore`:
```gitignore
# AFIP certificates and tokens (sensitive data - NEVER commit)
certs/
afip_tokens/
*.crt
*.key
*.pem
```

### ✅ Verificar antes de commit

```bash
git status
```

Si ves archivos `.crt`, `.key` o `certs/`, DETENTE:
```bash
git restore --staged certs/
git restore --staged *.crt *.key
```

### 🔐 Rotación de Certificados

**Desarrollo**:
- Regenera certificados de prueba: `npm run afip:generar-cert`

**Producción**:
1. Genera nuevos certificados en AFIP
2. Exporta con `npm run afip:exportar-cert`
3. Actualiza variables en Vercel/Railway
4. Verifica deployment

---

## 📚 Comandos Útiles

```bash
# Generar certificado de prueba
npm run afip:generar-cert

# Exportar para deployment
npm run afip:exportar-cert

# Verificar certificado actual
npm run afip:verificar-cert

# Diagnosticar problemas AFIP
npm run afip:diagnostico

# Probar conexión completa
npm run afip:test-completo
```

---

## 🆘 Necesitas Ayuda?

1. **Revisa los logs** del backend:
   ```bash
   npm run dev
   ```

2. **Ejecuta diagnóstico**:
   ```bash
   npm run afip:diagnostico
   ```

3. **Documentación AFIP**:
   - Ver `backend/AFIP_INTEGRATION_STATUS.md`
   - Ver `backend/FACTURACION_AFIP.md`

4. **Soporte**:
   - Revisa issues en GitHub
   - Consulta documentación oficial AFIP

---

## 📝 Notas Adicionales

- **Homologación**: Usa certificados de prueba con `AFIP_PRODUCTION=false`
- **Producción**: Usa certificados oficiales con `AFIP_PRODUCTION=true`
- **CUIT**: El CUIT del certificado DEBE coincidir con `AFIP_CUIT` en `.env`
- **Punto de Venta**: Debe estar autorizado en AFIP para facturación electrónica

---

**Última actualización**: 21 de noviembre de 2025
