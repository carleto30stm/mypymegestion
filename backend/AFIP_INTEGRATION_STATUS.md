# Estado de la integración AFIP (resumen para retomar)

Fecha: 13 de noviembre de 2025
Branch: ventas

Resumen rápido
--------------
Documentación breve de los trabajos realizados y los hallazgos para que puedas retomar la facturación más tarde sin perder contexto.

Archivos relevantes añadidos / utilizados
---------------------------------------
- `backend/.env` - contiene las variables AFIP (AFIP_CUIT, AFIP_PUNTO_VENTA, SDK_ACCESS_TOKEN, rutas de certificados).
- `backend/.env.example` - plantilla con variables esperadas.
- `backend/src/services/afipService.ts` - servicio que envía comprobantes a AFIP usando `@afipsdk/afip.js`.
- `backend/src/controllers/facturacionController.ts` - controlador que crea facturas y solicita CAE (usa `AFIPService.solicitarCAE`).
- `backend/src/routes/facturacionRoutes.ts` - rutas expuestas en `/api/facturacion` (incluye `/autorizar`).
- `backend/scripts/test-afip-conexion.js` - script de verificación de conexión y autenticación con AFIP (ya existente y útil para tests).
- `backend/scripts/generar-certificado-afip.js` - script para generar certificados de desarrollo mediante automatización del SDK (para homologación).
- `backend/scripts/debug-afip-auth.js` - script creado durante el análisis para obtener error completo de autenticación (ubicado en `backend/scripts/`).

Hallazgos principales
---------------------
1. Variables y certificados
   - `SDK_ACCESS_TOKEN` está presente en `backend/.env` (valor: presente). Esto permite usar automatizaciones del SDK (por ejemplo `CreateAutomation`).
   - `AFIP_CERT_PATH` y `AFIP_KEY_PATH` apuntan a `./certs/cert.crt` y `./certs/private.key`. Ambos archivos existen en `backend/certs/`.

2. Tests ejecutados
   - Ejecuté `node scripts/test-afip-conexion.js` desde `backend/`.
   - Resultado: conexión al servidor AFIP OK (AppServer / DbServer / AuthServer = OK), pero autenticación falló con HTTP 400.
   - Mensaje de error devuelto por el SDK/AFIP: "El certificado no es válido. Asegúrate de enviar el contenido del certificado (no la ruta del archivo). Lee el archivo y pasa su contenido al parámetro cert." (esto indica que el SDK recibió la ruta en vez del contenido PEM en la llamada que requiere el contenido).

3. Diagnóstico y causa probable
   - `@afipsdk/afip.js` requiere que los parámetros `cert` y `key` contengan el contenido PEM (string) del certificado y la clave privada, no solo la ruta del archivo.
   - En el código actual `afipService` el constructor está pasando `config.cert` y `config.key` tal cual (probablemente son rutas). El SDK intentó usar esos valores y AFIP respondió 400.
   - Acción de diagnóstico: se creó y ejecutó `backend/scripts/debug-afip-auth.js` para imprimir el error crudo; confirmó el 400 y el mensaje de AFIP arriba citado.

Acciones realizadas (qué se hizo hasta ahora)
---------------------------------------------
- Localicé dónde se usa `SDK_ACCESS_TOKEN` y los scripts relacionados (`test-afip-conexion.js`, `generar-certificado-afip.js`).
- Ejecuté `node scripts/test-afip-conexion.js` y recogí la salida (fallo de autenticación con detalle del error 400).
- Creé `backend/scripts/debug-afip-auth.js` para obtener la traza completa del error (muestra la respuesta con `data.message` explicativo).
- (Tentativa) preparé un cambio sugerido para `afipService.ts` que lee las rutas `cert` y `key` desde disco y pasa el contenido PEM al SDK — ese parche quedó planeado pero no aplicado (por seguridad/permiso). Si quieres, puedo aplicarlo ahora.

Recomendaciones / próximos pasos para retomar
--------------------------------------------
1. Arreglar `AFIPService` para pasar contenido PEM al SDK
   - Opción A (recomendada): modificar `backend/src/services/afipService.ts` para que, si `config.cert` y `config.key` apuntan a archivos, el servicio los lea (fs.readFileSync) y pase su contenido como strings a `new Afip({ cert: content, key: contentKey, ... })`.
   - Opción B: (no recomendado) copiar el contenido PEM directamente en variables de entorno (ej: `AFIP_CERT_CONTENT`, `AFIP_KEY_CONTENT`) y configurar `afipService` para usarlas. Esto complica la gestión y no es la práctica recomendada.

2. Una vez hecho el ajuste, repetir test de conexión:

```powershell
cd backend;
node scripts/test-afip-conexion.js
```

3. Generar certificados (si es necesario para homologación)
   - Para desarrollo/homologación puedes usar `node scripts/generar-certificado-afip.js` (sigue las instrucciones interactivas). Este script usa `SDK_ACCESS_TOKEN` y automatizaciones del SDK para generar `cert.crt` y `private.key` en `backend/certs/`.

4. Probar autorización de factura de prueba
   - Crear factura (desde una venta o manual) usando las rutas:
     - POST `/api/facturacion/desde-venta` con body { ventaId }
     - o POST `/api/facturacion/manual` con datos mínimos.
   - Llamar POST `/api/facturacion/:id/autorizar` y verificar CAE en la respuesta.

5. Si la autenticación sigue fallando
   - Revisar que el CUIT (AFIP_CUIT) sea el correcto y que el certificado esté registrado/habilitado para facturación electrónica en AFIP.
   - Revisar que el `SDK_ACCESS_TOKEN` sea válido y no haya expirado. El token usado en `.env` apareció activo para las pruebas (no impedía conectarse), pero la autenticación con certificados falló.
   - Revisar logs/response.data del error para más detalles (ya está el mensaje principal: enviar contenido PEM en `cert`).

Notas operativas y seguridad
----------------------------
- No subas certificados ni claves privadas al repo público. Los archivos `backend/certs/private.key` y `cert.crt` deben mantenerse fuera del control de versiones (idealmente en `.gitignore`).
- Para producción: gestiona certificados y secretos con un secreto manager (Azure Key Vault, AWS Secrets Manager, Railway env, etc.) y asegúrate de que la rotación y permisos estén controlados.

Comandos útiles (para cuando retomes)
------------------------------------
- Ejecutar test de conexión (muestra el problema actual):

```powershell
cd backend; node scripts/test-afip-conexion.js
```

- Ejecutar debug con detalle de error (devuéveme la salida si falla):

```powershell
cd backend; node scripts/debug-afip-auth.js
```

- Generar certificados de desarrollo (interactivo):

```powershell
cd backend; node scripts/generar-certificado-afip.js
```

- Probar autorizar factura (ejemplo curl):

```powershell
curl -X POST "http://localhost:3001/api/facturacion/<FACTURA_ID>/autorizar" -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json"
```

Resumen breve (qué falta)
--------------------------
- Corregir `afipService` para pasar contenido PEM del certificado/clave al SDK y volver a probar. Esto muy probablemente resolverá el 400 actual.
- Probar autorización de factura y revisar flujo CAE/estado.
- Documentar y automatizar tests de integración AFIP en CI (opcional, con modo homologación).

Si quieres, aplico ahora el cambio en `backend/src/services/afipService.ts` para leer los archivos y pasar su contenido al SDK, y luego vuelvo a ejecutar `node scripts/test-afip-conexion.js` y te traigo la salida completa. ¿Lo aplico ahora?
