# Configuración de AFIP para Homologación

## Paso 1: Generar Certificado de Testing

Para homologación, necesitas generar un certificado autofirmado y subirlo a AFIP:

```bash
# Ir a la carpeta certs
cd backend/certs

# Generar clave privada
openssl genrsa -out private.key 2048

# Generar solicitud de certificado (CSR)
openssl req -new -key private.key -subj "/C=AR/O=AFIP/CN=wsfe/serialNumber=CUIT 20409378472" -out request.csr

# Generar certificado autofirmado (válido por 365 días)
openssl x509 -req -days 365 -in request.csr -signkey private.key -out cert.crt

# Limpiar CSR
rm request.csr
```

**IMPORTANTE**: Usa el CUIT de testing de AFIP: `20409378472`

## Paso 2: Subir Certificado al Portal AFIP (Homologación)

1. Ingresa a **AFIP Homologación**: https://auth.afip.gob.ar/contribuyente_/login.xhtml
2. Credenciales de testing AFIP:
   - CUIT: 20409378472
   - Clave Fiscal: Debes crear una en el portal de homologación
3. Ir a: **Administración de Certificados Digitales**
4. Seleccionar: **Nuevo Certificado**
5. Servicio: **wsfe** (Web Service Facturación Electrónica)
6. Subir el archivo `cert.crt` generado
7. AFIP te dará un **Alias** - anótalo

## Paso 3: Verificar Variables de Entorno

Asegúrate que tu `.env` tenga:

```env
# CUIT de testing AFIP (NO usar CUIT real en homologación)
AFIP_CUIT=20409378472
AFIP_PRODUCTION=false
AFIP_CERT_PATH=./certs/cert.crt
AFIP_KEY_PATH=./certs/private.key
AFIP_TA_FOLDER=./afip_tokens
AFIP_PUNTO_VENTA=2
```

## Paso 4: Probar Autorización

Una vez configurado:

```bash
# Reiniciar el servidor backend
cd backend
npm run dev
```

Luego prueba crear y autorizar una factura desde el frontend.

## Errores Comunes

### Error 401 - Unauthorized
- **Causa**: Certificado no coincide con el subido en AFIP o CUIT incorrecto
- **Solución**: Verifica que el certificado local sea el mismo que subiste a AFIP

### Error 1001 - Certificado inválido
- **Causa**: El certificado no está activo en AFIP
- **Solución**: Activa el certificado en el portal de AFIP

### Error 600 - CUIT no habilitado
- **Causa**: El CUIT no tiene permiso para el servicio wsfe
- **Solución**: En homologación, usa el CUIT de testing 20409378472

## Notas Importantes

- **Homologación**: Usa CUIT 20409378472 y certificados de testing
- **Producción**: Cuando pases a producción, cambia:
  - `AFIP_CUIT` al CUIT real de tu empresa
  - `AFIP_PRODUCTION=true`
  - Genera nuevo certificado con tu CUIT y súbelo en AFIP producción
- Los certificados vencen cada 365 días, debes renovarlos

## Recursos

- Portal AFIP Homologación: https://auth.afip.gob.ar/contribuyente_/login.xhtml
- Documentación AFIP wsfe: http://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp
- SDK @afipsdk: https://github.com/AfipSDK/afip.js
