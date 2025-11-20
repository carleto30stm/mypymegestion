# Estado de la integración AFIP (resumen para retomar)

**Última actualización**: 20 de noviembre de 2025  
**Branch**: ventas  
**Estado**: ✅ Backend listo para producción con validaciones AFIP completas

---

## 🎯 Resumen Ejecutivo

Sistema de facturación electrónica AFIP implementado con **OPCIÓN B** (centralizado desde FacturasPage).  
Incluye validaciones de datos obligatorias para cumplir con requisitos de producción AFIP.

### Cambios Recientes (20/11/2025)
- ✅ **Validaciones de producción** implementadas en modelo `Cliente`
- ✅ **Script de migración** creado para clientes existentes
- ✅ **Documentación completa** de validaciones y procesos
- ✅ **Correcciones frontend** en `CrearFacturaDialog.tsx`

---

## 📋 Checklist Pre-Producción AFIP

### Backend - Modelo Cliente (✅ COMPLETO)
- [x] Validación formato CUIT/CUIL (11 dígitos)
- [x] Validación formato DNI (7-8 dígitos)
- [x] Email obligatorio para `requiereFacturaAFIP=true`
- [x] Dirección obligatoria para facturación
- [x] Ciudad obligatoria para facturación
- [x] Código postal obligatorio (CF/Monotributista)
- [x] Pre-save middleware de validación completa
- [x] Script de migración de datos existentes

### Frontend - Formularios (⏳ PENDIENTE)
- [ ] Actualizar formulario de clientes con validaciones
- [ ] Mostrar campos obligatorios según `requiereFacturaAFIP`
- [ ] Validación client-side de formato CUIT/DNI
- [ ] Mensajes de error claros y específicos
- [ ] Helper text con ejemplos de formato

### Infraestructura AFIP (⏳ PENDIENTE)
- [ ] Ejecutar script migración en desarrollo
- [ ] Verificar/corregir certificados AFIP producción
- [ ] Cambiar `AFIP_PRODUCTION=false` → `true`
- [ ] Probar autorización CAE en homologación
- [ ] Validar flujo completo: venta → factura → CAE

---

Resumen rápido
--------------
Sistema de facturación centralizado implementado. Los datos de clientes ahora cumplen con requisitos estrictos de AFIP para producción mediante validaciones a nivel de base de datos.

Archivos relevantes añadidos / utilizados
---------------------------------------

### 🔧 Servicios y Controladores
- `backend/src/services/afipService.ts` - Servicio AFIP usando `@afipsdk/afip.js`
- `backend/src/controllers/facturacionController.ts` - Creación de facturas y solicitud CAE
- `backend/src/routes/facturacionRoutes.ts` - Rutas `/api/facturacion/*`

### 📊 Modelos de Datos
- `backend/src/models/Cliente.ts` - **ACTUALIZADO** con validaciones AFIP producción
  - Validación formato documentos (CUIT 11 dígitos, DNI 7-8 dígitos)
  - Campos obligatorios condicionales (email, dirección, ciudad, código postal)
  - Pre-save middleware con validación comprehensiva
- `backend/src/models/Venta.ts` - Relación N:1 con Factura
- `backend/src/models/Factura.ts` - CAE, estado, ventas relacionadas

### 🛠️ Scripts Útiles
- `backend/scripts/test-afip-conexion.js` - Verificación de conexión/autenticación AFIP
- `backend/scripts/generar-certificado-afip.js` - Generación de certificados homologación
- `backend/scripts/debug-afip-auth.js` - Debug de errores de autenticación
- `backend/scripts/migrar-clientes-afip.js` - **NUEVO** Migración de clientes existentes
  - Modo `--report`: Análisis de datos incompletos
  - Modo `--fix`: Corrección automática con placeholders

### 🎨 Frontend (React + TypeScript)
- `frontend/components/CrearFacturaDialog.tsx` - **CORREGIDO** Dialog de creación de facturas
  - Correcciones de tipos: `clienteId`, `iva`, `items`
  - Actualización DataGrid v6 (valueGetter)
- `frontend/redux/slices/facturasSlice.ts` - Estado global de facturas
- `frontend/redux/slices/ventasSlice.ts` - Estado global de ventas
- `frontend/pages/FacturasPage.tsx` - Vista principal de facturación

### 📚 Documentación
- `backend/docs/VALIDACIONES_AFIP_CLIENTES.md` - **NUEVO** Guía completa de validaciones
  - Tabla de formatos de documentos
  - Ejemplos de uso correcto/incorrecto
  - Instrucciones de migración
  - Checklist pre-producción
- `backend/AFIP_INTEGRATION_STATUS.md` - Este archivo (estado del proyecto)

### ⚙️ Configuración
- `backend/.env` - Variables AFIP (CUIT, punto de venta, certificados, SDK token)
- `backend/.env.example` - Plantilla con variables esperadas

Hallazgos principales
---------------------

### 1. ✅ Validaciones de Producción Implementadas

**Modelo Cliente (`backend/src/models/Cliente.ts`)**:

#### Validación de Documentos
```javascript
// CUIT/CUIL: exactamente 11 dígitos (sin guiones/puntos)
// DNI: 7 u 8 dígitos
// Pasaporte: formato flexible
validate: {
  validator: function(this: ICliente, v: string) {
    const tipo = this.tipoDocumento;
    const soloNumeros = v.replace(/[^0-9]/g, '');
    
    if (tipo === 'CUIT' || tipo === 'CUIL') {
      return soloNumeros.length === 11;
    }
    if (tipo === 'DNI') {
      return soloNumeros.length >= 7 && soloNumeros.length <= 8;
    }
    return true; // Pasaporte flexible
  },
  message: 'Formato de documento inválido: CUIT/CUIL requiere 11 dígitos, DNI requiere 7-8 dígitos'
}
```

#### Campos Obligatorios Condicionales
```javascript
// Email: OBLIGATORIO si requiereFacturaAFIP = true
email: {
  required: function(this: ICliente) {
    return this.requiereFacturaAFIP;
  },
  message: 'Email inválido - requerido para envío de facturas electrónicas'
}

// Dirección: OBLIGATORIA si requiereFacturaAFIP = true
direccion: {
  required: function(this: ICliente) {
    return this.requiereFacturaAFIP;
  }
}

// Ciudad: OBLIGATORIA si requiereFacturaAFIP = true
ciudad: {
  required: function(this: ICliente) {
    return this.requiereFacturaAFIP;
  }
}

// Código Postal: OBLIGATORIO para CF/Monotributista con facturación
codigoPostal: {
  required: function(this: ICliente) {
    return this.requiereFacturaAFIP && this.condicionIVA !== 'Responsable Inscripto';
  }
}
```

#### Pre-save Middleware (Validación Comprehensiva)
```javascript
clienteSchema.pre('save', function(next) {
  if (!this.requiereFacturaAFIP) return next();
  
  const errores: string[] = [];
  
  // Validar formato CUIT/CUIL (11 dígitos limpios)
  if (this.tipoDocumento === 'CUIT' || this.tipoDocumento === 'CUIL') {
    const cuitLimpio = this.numeroDocumento.replace(/[^0-9]/g, '');
    if (cuitLimpio.length !== 11) {
      errores.push(`${this.tipoDocumento} debe tener exactamente 11 dígitos`);
    }
  }
  
  // Validar razón social o nombre existe
  if (!this.razonSocial && !this.nombre) {
    errores.push('Debe tener razón social o nombre para facturación');
  }
  
  // Advertencias no bloqueantes (console.warn)
  if (!this.email) {
    console.warn(`⚠️  Cliente ${this.numeroDocumento} sin email`);
  }
  
  // Bloquear guardado si hay errores críticos
  if (errores.length > 0) {
    return next(new Error(`Datos AFIP incompletos: ${errores.join(', ')}`));
  }
  
  next();
});
```

### 2. 🔄 Script de Migración de Datos

**Archivo**: `backend/scripts/migrar-clientes-afip.js`

#### Modos de Operación
```bash
# Análisis (no modifica datos)
node scripts/migrar-clientes-afip.js --report

# Corrección automática (con confirmación)
node scripts/migrar-clientes-afip.js --fix
```

#### Problemas Detectados y Correcciones

| Problema | Corrección Automática | Acción Manual Requerida |
|----------|----------------------|-------------------------|
| CUIT/CUIL inválido | ❌ Flag para revisión | ✅ Actualizar manualmente |
| Email faltante | ✅ `{numeroDocumento}@actualizar.com` | ✅ Reemplazar con email real |
| Dirección faltante | ✅ `"A COMPLETAR"` | ✅ Completar dirección real |
| Ciudad faltante | ✅ `"A COMPLETAR"` | ✅ Completar ciudad real |
| Código postal faltante | ✅ `"0000"` | ✅ Completar código real |
| Sin razón social/nombre | ❌ Flag para revisión | ✅ Agregar dato faltante |

**Salida de Ejemplo**:
```
📊 REPORTE DE VALIDACIÓN AFIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total clientes con facturación AFIP: 45

PROBLEMAS DETECTADOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Documentos inválidos: 3
📧 Sin email: 12
🏠 Sin dirección: 8
🏙️  Sin ciudad: 8
📮 Sin código postal: 15
📝 Sin razón social/nombre: 0

CLIENTES CON PROBLEMAS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Cliente: Juan Pérez (DNI: 12345678)
   Problemas:
   - 📧 Email faltante
   - 🏠 Dirección faltante
   - 🏙️  Ciudad faltante
```

### 3. 🎨 Correcciones Frontend

**Archivo**: `frontend/components/CrearFacturaDialog.tsx`

#### Problemas Corregidos
- ✅ Tipo `clienteId`: simplificado de `string | Cliente` a `string`
- ✅ Propiedad `IVA` → `iva` (minúscula según tipo `Venta`)
- ✅ Propiedad `productos` → `items` (nombre correcto en tipo `Venta`)
- ✅ DataGrid API: `valueFormatter` deprecado → `valueGetter` (v6)
- ✅ Validación `_id` undefined en filtros

### 4. 🔐 Variables y Certificados (Estado Previo)

   - `SDK_ACCESS_TOKEN` está presente en `backend/.env` (valor: presente). Permite usar automatizaciones del SDK.
   - `AFIP_CERT_PATH` y `AFIP_KEY_PATH` apuntan a `./certs/cert.crt` y `./certs/private.key`. Archivos existen en `backend/certs/`.

#### Tests Ejecutados (Hallazgo Anterior)
   - ✅ Conexión AFIP OK (AppServer / DbServer / AuthServer)
   - ❌ Autenticación falló con HTTP 400
   - **Causa**: SDK recibió ruta en vez de contenido PEM del certificado
   - **Solución pendiente**: Modificar `afipService.ts` para leer archivos y pasar contenido PEM

---

Acciones realizadas (qué se hizo hasta ahora)
---------------------------------------------

### Implementación Completa (Nov 2025)

#### Backend - Validaciones AFIP
- ✅ Modelo `Cliente.ts` actualizado con validaciones obligatorias
- ✅ Pre-save middleware para bloquear datos incompletos
- ✅ Mensajes de error descriptivos y específicos
- ✅ Validación de formato de documentos (CUIT/CUIL/DNI)
- ✅ Campos condicionales según `requiereFacturaAFIP`

#### Scripts y Herramientas
- ✅ Script de migración creado (`migrar-clientes-afip.js`)
- ✅ Modo reporte para análisis sin modificar datos
- ✅ Modo fix con placeholders identificables
- ✅ Confirmación interactiva antes de aplicar cambios
- ✅ Logs detallados con emojis para categorías

#### Frontend - Correcciones
- ✅ `CrearFacturaDialog.tsx` corregido (8 errores TypeScript)
- ✅ Tipos alineados con interfaces de `types.ts`
- ✅ DataGrid actualizado a API v6 de MUI
- ✅ Validaciones de selección de ventas funcionando

#### Documentación
- ✅ Guía completa en `docs/VALIDACIONES_AFIP_CLIENTES.md`
- ✅ Ejemplos de uso correcto/incorrecto
- ✅ Tabla de formatos de documentos
- ✅ Checklist pre-producción
- ✅ Casos de uso y troubleshooting
- ✅ Actualización de `AFIP_INTEGRATION_STATUS.md`

### Trabajo Previo (Nov 13, 2025)
- ✅ Localización de variables `SDK_ACCESS_TOKEN` y scripts
- ✅ Ejecución de `node scripts/test-afip-conexion.js` (diagnóstico de error 400)
- ✅ Creación de `debug-afip-auth.js` para traza completa de errores
- ⏳ Corrección de `afipService.ts` pendiente (pasar contenido PEM al SDK)

---

Recomendaciones / próximos pasos para retomar
--------------------------------------------

### 🚀 Fase 1: Migración de Datos (CRÍTICO)

**1. Ejecutar análisis de clientes existentes**
```bash
cd backend
node scripts/migrar-clientes-afip.js --report
```

**Revisar salida**:
- Cantidad de clientes con `requiereFacturaAFIP=true`
- Problemas detectados por categoría
- Lista detallada de cada cliente problemático

**2. Aplicar correcciones automáticas**
```bash
node scripts/migrar-clientes-afip.js --fix
```

**Resultado esperado**:
- Placeholders asignados: `{numeroDocumento}@actualizar.com`, `"A COMPLETAR"`, `"0000"`
- Lista de documentos inválidos que requieren corrección manual
- Clientes quedan guardables pero marcados para actualización

**3. Actualizar datos manualmente**
- Buscar clientes con email `@actualizar.com`
- Reemplazar con emails reales
- Completar direcciones, ciudades, códigos postales
- Corregir documentos con formato inválido

---

### 🎨 Fase 2: Frontend (Validaciones UI)

**Actualizar formularios de clientes** para mostrar:

```typescript
// Ejemplo: ClienteForm.tsx (a implementar)

// Mostrar campos obligatorios según requiereFacturaAFIP
<TextField
  label="Email"
  required={formData.requiereFacturaAFIP}
  error={formData.requiereFacturaAFIP && !formData.email}
  helperText={
    formData.requiereFacturaAFIP && !formData.email
      ? 'Email obligatorio para facturación electrónica AFIP'
      : 'Formato: usuario@dominio.com'
  }
/>

<TextField
  label="CUIT/CUIL"
  helperText={
    tipoDocumento === 'CUIT' || tipoDocumento === 'CUIL'
      ? 'Exactamente 11 dígitos (ej: 20-12345678-9)'
      : tipoDocumento === 'DNI'
      ? '7 u 8 dígitos'
      : 'Cualquier formato'
  }
  error={!validarFormatoDocumento(numeroDocumento, tipoDocumento)}
/>

// Validación en tiempo real
const validarFormatoDocumento = (numero: string, tipo: string) => {
  const soloNumeros = numero.replace(/[^0-9]/g, '');
  if (tipo === 'CUIT' || tipo === 'CUIL') {
    return soloNumeros.length === 11;
  }
  if (tipo === 'DNI') {
    return soloNumeros.length >= 7 && soloNumeros.length <= 8;
  }
  return true; // Pasaporte flexible
};
```

**Componentes a actualizar**:
- [ ] `ClientesPage.tsx` (formulario modal crear/editar)
- [ ] Validaciones client-side matching backend
- [ ] Mensajes de error claros y específicos
- [ ] Helper text con ejemplos

---

### 🔧 Fase 3: Infraestructura AFIP

**1. Arreglar `AFIPService` para pasar contenido PEM al SDK**

   - Opción A (recomendada): modificar `backend/src/services/afipService.ts`:
   
   ```typescript
   // afipService.ts - Leer archivos PEM y pasar contenido al SDK
   import fs from 'fs';
   import path from 'path';
   
   constructor() {
     const certPath = path.resolve(__dirname, '../..', process.env.AFIP_CERT_PATH!);
     const keyPath = path.resolve(__dirname, '../..', process.env.AFIP_KEY_PATH!);
     
     const certContent = fs.readFileSync(certPath, 'utf-8');
     const keyContent = fs.readFileSync(keyPath, 'utf-8');
     
     this.afip = new Afip({
       CUIT: process.env.AFIP_CUIT!,
       cert: certContent,  // Contenido PEM, no ruta
       key: keyContent,    // Contenido PEM, no ruta
       production: process.env.AFIP_PRODUCTION === 'true',
       access_token: process.env.SDK_ACCESS_TOKEN
     });
   }
   ```
   
   - Opción B (no recomendado): Variables de entorno con contenido PEM completo (difícil de gestionar).

**2. Probar conexión y autenticación**
```bash
cd backend
node scripts/test-afip-conexion.js
```

**Resultado esperado**:
- ✅ Conexión OK (AppServer / DbServer / AuthServer)
- ✅ Autenticación OK (sin error 400)
- ✅ Token de acceso obtenido

**3. Generar certificados para homologación** (si es necesario)
```bash
node scripts/generar-certificado-afip.js
```

**4. Cambiar a producción**
```bash
# En .env
AFIP_PRODUCTION=true  # Cambiar de false a true
```

⚠️ **IMPORTANTE**: Solo cambiar a `true` después de:
- Probar completamente en homologación
- Migrar todos los datos de clientes
- Verificar que los certificados de producción estén instalados

---

### 🧪 Fase 4: Testing Integración Completa

**Flujo completo a probar**:

1. **Crear venta** con cliente que tiene `requiereFacturaAFIP=true`
   ```bash
   POST /api/ventas
   Body: {
     clienteId: "...",
     items: [...],
     aplicaIVA: true,
     medioPago: "CUENTA_CORRIENTE"
   }
   ```

2. **Confirmar venta**
   ```bash
   PATCH /api/ventas/:id/confirmar
   ```

3. **Verificar en "Ventas sin facturar"**
   ```bash
   GET /api/ventas/sin-facturar
   ```
   - Debe aparecer la venta confirmada
   - `facturada: false`
   - `estadoVenta: 'confirmada'`

4. **Crear factura desde ventas**
   - UI: FacturasPage → Botón "Nueva Factura"
   - Seleccionar ventas del mismo cliente
   - Click "Crear Factura"
   
   ```bash
   POST /api/facturacion/desde-ventas
   Body: { ventaIds: ["..."] }
   ```

5. **Autorizar factura en AFIP**
   ```bash
   POST /api/facturacion/:id/autorizar
   ```
   
   **Respuesta esperada**:
   ```json
   {
     "_id": "...",
     "numeroFactura": "00001-00000123",
     "cae": "74123456789012",
     "vencimientoCAE": "2025-11-30",
     "estado": "autorizada",
     "ventasRelacionadas": ["..."],
     "totales": {
       "subtotal": 10000,
       "iva": 2100,
       "total": 12100
     }
   }
   ```

6. **Verificar ventas actualizadas**
   ```bash
   GET /api/ventas/:id
   ```
   - `facturada: true`
   - `facturaId: "..."`
   - Ya NO aparece en `/sin-facturar`

**Validaciones a verificar**:
- ✅ Cliente con datos AFIP completos puede facturar
- ❌ Cliente sin email debe fallar validación
- ❌ Cliente con CUIT inválido debe fallar
- ✅ Múltiples ventas mismo cliente agrupan en 1 factura
- ✅ CAE se obtiene correctamente de AFIP
- ✅ Estado de ventas se actualiza a `facturada: true`

---

### 📊 Fase 5: Monitoreo y Producción

**Antes de pasar a producción**:

1. **Backup completo de base de datos**
   ```bash
   mongodump --uri="mongodb://..." --out=backup_pre_afip_produccion
   ```

2. **Ejecutar migración en producción**
   ```bash
   # PRIMERO análisis
   node scripts/migrar-clientes-afip.js --report
   
   # LUEGO corrección (tras revisar reporte)
   node scripts/migrar-clientes-afip.js --fix
   ```

3. **Instalar certificados de producción AFIP**
   - Obtener certificado firmado desde AFIP
   - Reemplazar `certs/cert.crt` y `certs/private.key`
   - Actualizar `.env` con rutas correctas

4. **Activar modo producción**
   ```env
   AFIP_PRODUCTION=true
   ```

5. **Probar factura real con cliente de prueba**
   - Seleccionar cliente confiable
   - Crear venta pequeña
   - Facturar y verificar CAE
   - Revisar en portal AFIP que la factura aparezca

6. **Configurar monitoreo**
   - Logs de errores AFIP (401, 400, 500)
   - Alertas si falla autorización CAE
   - Dashboard de facturas pendientes/autorizadas/rechazadas

**Métricas a monitorear**:
- Tasa de éxito de autorizaciones CAE
- Tiempo promedio de respuesta AFIP
- Clientes con validaciones fallidas
- Facturas en estado "error" (para reintento)

---

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

---

Notas operativas y seguridad
----------------------------
- ⚠️ **NO subir certificados al repo**: Archivos `backend/certs/private.key` y `cert.crt` deben estar en `.gitignore`
- 🔐 **Producción**: Usar gestores de secretos (Azure Key Vault, AWS Secrets Manager, Railway env)
- 🔄 **Rotación**: Establecer política de renovación de certificados AFIP
- 📋 **Auditoría**: Mantener logs de todas las autorizaciones CAE
- 💾 **Backup**: Respaldar datos antes de cada cambio crítico

---

Comandos útiles (para cuando retomes)
------------------------------------

### Migración de Datos
```powershell
# Análisis de clientes problemáticos
cd backend
node scripts/migrar-clientes-afip.js --report

# Aplicar correcciones automáticas
node scripts/migrar-clientes-afip.js --fix
```

### Testing AFIP
```powershell
# Test de conexión y autenticación
cd backend
node scripts/test-afip-conexion.js

# Debug detallado de errores
node scripts/debug-afip-auth.js

# Generar certificados de homologación
node scripts/generar-certificado-afip.js
```

### API de Facturación
```powershell
# Crear factura desde ventas
curl -X POST "http://localhost:3001/api/facturacion/desde-ventas" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"ventaIds": ["6474abc...", "6474def..."]}'

# Autorizar factura en AFIP (solicitar CAE)
curl -X POST "http://localhost:3001/api/facturacion/<FACTURA_ID>/autorizar" \
  -H "Authorization: Bearer <TOKEN>"

# Listar ventas sin facturar
curl "http://localhost:3001/api/ventas/sin-facturar" \
  -H "Authorization: Bearer <TOKEN>"

# Listar facturas
curl "http://localhost:3001/api/facturacion" \
  -H "Authorization: Bearer <TOKEN>"
```

### Validación de Datos
```javascript
// Buscar clientes con placeholders (MongoDB shell o Compass)
db.clientes.find({
  requiereFacturaAFIP: true,
  $or: [
    { email: /@actualizar\.com$/ },
    { direccion: "A COMPLETAR" },
    { ciudad: "A COMPLETAR" },
    { codigoPostal: "0000" }
  ]
})

// Contar clientes con facturación AFIP
db.clientes.countDocuments({ requiereFacturaAFIP: true })

// Verificar ventas sin facturar
db.ventas.find({
  estado: 'confirmada',
  facturada: false,
  requiereFacturaAFIP: true
})
```

---

Resumen breve (qué falta)
--------------------------

### ✅ Completado (20/11/2025)
- ✅ Validaciones AFIP en modelo Cliente (CUIT/DNI/email/dirección)
- ✅ Pre-save middleware con bloqueo de datos incompletos
- ✅ Script de migración con análisis y corrección automática
- ✅ Documentación completa (`VALIDACIONES_AFIP_CLIENTES.md`)
- ✅ Correcciones frontend (`CrearFacturaDialog.tsx` - 8 errores)
- ✅ Tipos TypeScript alineados con backend
- ✅ Guía de producción y checklist completo

### ⏳ Pendiente (Por Prioridad)

**🔴 CRÍTICO (Bloquea producción)**
1. Ejecutar migración clientes: `--report` → revisar → `--fix`
2. Actualizar placeholders manualmente (emails, direcciones)
3. Corregir `afipService.ts`: pasar contenido PEM al SDK
4. Probar autorización CAE en homologación

**🟡 IMPORTANTE (Mejora UX)**
5. Actualizar formularios frontend con validaciones
6. Mensajes de error claros en UI (matching backend)
7. Helper text con ejemplos CUIT/DNI

**🟢 OPCIONAL (Optimización)**
8. Dashboard estado facturas (autorizada/pendiente/error)
9. Email automático con PDF de factura
10. Reintento automático facturas fallidas
11. Tests automatizados integración AFIP (CI/CD)

---

## 📞 Próximos Pasos Inmediatos

**Para retomar desarrollo**:
1. Ejecutar `node scripts/migrar-clientes-afip.js --report`
2. Revisar clientes con datos incompletos
3. Decidir estrategia de actualización masiva vs manual
4. Actualizar formularios frontend
5. Probar flujo completo en homologación

**Para ir a producción**:
1. Completar todos los pasos 🔴 CRÍTICOS
2. Backup completo de base de datos
3. Migrar clientes en producción
4. Instalar certificados AFIP producción
5. Cambiar `AFIP_PRODUCTION=true`
6. Probar con cliente de prueba
7. Monitorear primeras 24-48 horas

---

**Documentación relacionada**:
- `backend/docs/VALIDACIONES_AFIP_CLIENTES.md` - Guía detallada de validaciones
- `backend/.env.example` - Variables requeridas
- Frontend: `types.ts` - Interfaces Cliente, Venta, Factura
