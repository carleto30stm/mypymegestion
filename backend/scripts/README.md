# Scripts de Prueba AFIP y Migraciones

Esta carpeta contiene scripts para probar la integración con AFIP (Facturación Electrónica) y scripts de migración de datos.

## 📋 Scripts de Migración

### migracion-momento-cobro.js
**Migración de campo momentoCobro - Corrección crítica de deuda**

**Propósito:**
Agrega el campo `momentoCobro` a todas las ventas existentes que no lo tienen, asignando el valor por defecto `'diferido'`.

**Contexto:**
Este script es parte de las correcciones críticas identificadas en el análisis del flujo de facturación (ver `backend/docs/ANALISIS_FLUJO_FACTURACION.md`).

**Problema original:**
- Todas las ventas confirmadas generaban deuda en cuenta corriente, incluso ventas de contado (efectivo, cheque, tarjeta)
- Esto causaba deudas "fantasma" que luego se cancelaban con recibos

**Solución implementada:**
- Campo `momentoCobro` con tres valores:
  - `'anticipado'`: Cobro ANTES de confirmar (no genera deuda)
  - `'contra_entrega'`: Cobro AL MOMENTO de entregar (no genera deuda)
  - `'diferido'`: Cobro DESPUÉS de confirmar (SÍ genera deuda)
- Modificación en `confirmarVenta` para generar deuda solo si `momentoCobro === 'diferido'`

**Uso:**
```bash
# Desde el directorio backend/
cd backend

# Ejecutar script (NO requiere confirmación manual)
node scripts/migracion-momento-cobro.js
```

**Características:**
- ✅ **Idempotente**: Puede ejecutarse múltiples veces sin problemas
- ✅ **No destructivo**: Solo agrega el campo, no modifica ni elimina otros datos
- ✅ **Verificación automática**: Valida resultados después de la actualización
- ✅ **Reportes detallados**: Muestra estadísticas antes/después de la migración

**Testing antes de producción:**
```bash
# 1. Backup de la BD de producción
mongodump --uri="mongodb://..." --out=backup_pre_migracion

# 2. Restaurar en BD de desarrollo
mongorestore --uri="mongodb://localhost:27017/mygestor_dev" backup_pre_migracion/mygestor

# 3. Ejecutar script en desarrollo
MONGO_URI="mongodb://localhost:27017/mygestor_dev" node scripts/migracion-momento-cobro.js

# 4. Validar resultados manualmente
mongo mygestor_dev
> db.ventas.find({ momentoCobro: { $exists: false } }).count()  // Debe ser 0
```

---

### migracion-estados-granulares.js
**Migración de estados granulares - Workflow mejorado (Fase 2)**

**Propósito:**
Mapea estados legacy (`pendiente`, `confirmada`, `anulada`) a estados granulares que reflejan el ciclo completo de una venta con mayor detalle.

**Contexto:**
Esta migración es parte de la Fase 2 - Mejoras de Workflow del análisis de facturación. Agrega el campo `estadoGranular` con lógica inteligente basada en el progreso real de cada venta.

**Estados Granulares:**
- `borrador`: Venta creada, aún editable (no confirmada)
- `pendiente`: Venta registrada, pendiente de confirmar
- `confirmada`: Stock descontado, deuda generada si aplica
- `facturada`: Factura AFIP emitida y autorizada
- `entregada`: Mercadería despachada al cliente
- `cobrada`: Pago recibido en su totalidad
- `completada`: Todo el ciclo cerrado (confirmada + facturada + entregada + cobrada)
- `anulada`: Cancelada (con auditoría de motivo)

**Lógica de Mapeo:**
El script NO simplemente copia el estado legacy, sino que analiza:
- `estado` (legacy): pendiente, confirmada, anulada
- `estadoCobranza`: sin_cobrar, parcialmente_cobrado, cobrado
- `estadoEntrega`: sin_remito, remito_generado, en_transito, entregado
- `facturada`: boolean
- `facturaId`: ObjectId si tiene factura
- `montoCobrado` vs `total`: para verificar cobro completo

**Ejemplos de Mapeo:**
```javascript
// Venta confirmada, facturada, entregada y cobrada → completada
{ estado: 'confirmada', facturada: true, estadoEntrega: 'entregado', estadoCobranza: 'cobrado' }
→ estadoGranular: 'completada'

// Venta confirmada y cobrada, pero no entregada ni facturada → cobrada
{ estado: 'confirmada', facturada: false, estadoEntrega: 'sin_remito', estadoCobranza: 'cobrado' }
→ estadoGranular: 'cobrada'

// Venta confirmada pero sin actividad posterior → confirmada
{ estado: 'confirmada', facturada: false, estadoEntrega: 'sin_remito', estadoCobranza: 'sin_cobrar' }
→ estadoGranular: 'confirmada'
```

**Uso:**
```bash
# Desde el directorio backend/
cd backend

# Ejecutar script
node scripts/migracion-estados-granulares.js
```

**Salida esperada:**
```
============================================================
📋 MIGRACIÓN: Mapear estados legacy a estados granulares
============================================================

📊 Estado actual de la base de datos:
   Total de ventas: 150
   Ventas CON estadoGranular: 0
   Ventas SIN estadoGranular: 150

📋 Preview de mapeo (primeras 10 ventas):
────────────────────────────────────────────────────────────
   Venta        | Estado Legacy  | Estado Granular | Cobro     | Entrega   | Factura
────────────────────────────────────────────────────────────
   V-0001       | confirmada     | completada      | cobrado   | entregado | SÍ
   V-0002       | confirmada     | cobrada         | cobrado   | sin_remito| NO
   V-0003       | pendiente      | pendiente       | sin_cobrar| sin_remito| NO
   ...

📊 Distribución de estados granulares (después de migración):
   🎉 completada   :   45 ventas (30.0%)
   ✅ confirmada   :   40 ventas (26.7%)
   💰 cobrada      :   25 ventas (16.7%)
   ⏳ pendiente    :   20 ventas (13.3%)
   📄 facturada    :   10 ventas (6.7%)
   🚚 entregada    :    5 ventas (3.3%)
   ❌ anulada      :    5 ventas (3.3%)

✅ ÉXITO: Todas las ventas tienen ahora estadoGranular asignado
```

**Características:**
- ✅ **Idempotente**: Puede ejecutarse múltiples veces
- ✅ **Lógica inteligente**: No solo copia estado legacy
- ✅ **Preview detallado**: Muestra mapeo antes de aplicar
- ✅ **Bulk operations**: Rápido incluso con miles de ventas
- ✅ **Verificación automática**: Valida resultados

**Rollback:**
```javascript
// Eliminar campo estadoGranular
await Venta.updateMany({}, { $unset: { estadoGranular: "" } });
```

---

### migracion-medios-pago-unificados.js
**Unificación de enums de medios de pago - Fase 2**

**Propósito:**
Normaliza los valores de medios de pago a través de 3 tablas (Gastos, Ventas, ReciboPago) para usar un único enum MEDIOS_PAGO_UNIFICADO.

**Contexto:**
El sistema tenía 3 enums inconsistentes:
- **Gastos**: `'CHEQUE TERCERO'`, `'CHEQUE PROPIO'`, `'TARJETA DÉBITO'` (con espacios)
- **ReciboPago**: `'CHEQUE'`, `'TARJETA_DEBITO'`, `'TARJETA_CREDITO'` (valores diferentes)
- **Venta**: mezcla de ambos formatos

**Mapeo de Valores:**
```javascript
const MAPEO_MEDIOS_PAGO = {
  // Normalizar espacios a guiones bajos
  'CHEQUE TERCERO'   → 'CHEQUE_TERCERO',
  'CHEQUE PROPIO'    → 'CHEQUE_PROPIO',
  'TARJETA DÉBITO'   → 'TARJETA_DEBITO',
  'TARJETA CRÉDITO'  → 'TARJETA_CREDITO',
  'CUENTA CORRIENTE' → 'CUENTA_CORRIENTE',
  
  // Unificar semánticas diferentes
  'CHEQUE' → 'CHEQUE_TERCERO', // Por defecto cheques recibidos son de terceros
  
  // Valores especiales
  'RESERVA' → 'OTRO',
  '' → 'OTRO' // Vacío se mapea a OTRO
};
```

**Enum Unificado Final:**
- `EFECTIVO`
- `TRANSFERENCIA`
- `CHEQUE_TERCERO`
- `CHEQUE_PROPIO`
- `TARJETA_DEBITO`
- `TARJETA_CREDITO`
- `CUENTA_CORRIENTE`
- `OTRO`

**Uso:**
```bash
# Desde el directorio backend/
cd backend

# Ejecutar script
node scripts/migracion-medios-pago-unificados.js
```

**Salida esperada:**
```
============================================================
📋 MIGRACIÓN: Unificar enums de medios de pago
============================================================

📊 Analizando tabla Gastos...
   Distribución actual:
     EFECTIVO            :   200 registros (sin cambio)
     CHEQUE TERCERO      :   150 registros → CHEQUE_TERCERO
     TARJETA DÉBITO      :    80 registros → TARJETA_DEBITO
     CUENTA CORRIENTE    :    50 registros → CUENTA_CORRIENTE
     RESERVA             :    10 registros → OTRO

🔄 Actualizando Gastos...
✅ Gastos actualizados: 290

📊 Analizando tabla Ventas...
   Distribución actual:
     EFECTIVO            :   120 registros (sin cambio)
     CUENTA CORRIENTE    :    80 registros → CUENTA_CORRIENTE
     TRANSFERENCIA       :    50 registros (sin cambio)

🔄 Actualizando Ventas...
✅ Ventas actualizadas: 80

📊 Analizando tabla ReciboPago...
✅ ReciboPago actualizados: 45

📊 Distribución FINAL - Gastos:
   EFECTIVO            : 200 registros
   CHEQUE_TERCERO      : 150 registros
   TARJETA_DEBITO      :  80 registros
   CUENTA_CORRIENTE    :  50 registros
   TRANSFERENCIA       :  30 registros
   OTRO                :  10 registros
```

**Características:**
- ✅ **Normaliza espacios**: `'CHEQUE TERCERO'` → `'CHEQUE_TERCERO'`
- ✅ **Unifica semánticas**: `'CHEQUE'` → `'CHEQUE_TERCERO'`
- ✅ **Actualiza 3 tablas**: Gastos, Ventas, ReciboPago
- ✅ **ReciboPago especial**: Actualiza array `formasPago[]` individualmente
- ✅ **Bulk operations**: Operaciones masivas para mejor rendimiento
- ✅ **Before/After**: Muestra distribución con indicadores de cambio

**Testing antes de producción:**
```bash
# 1. Backup
mongodump --uri="mongodb://..." --out=backup_pre_medios_pago

# 2. Ejecutar en desarrollo
MONGO_URI="mongodb://localhost:27017/mygestor_dev" node scripts/migracion-medios-pago-unificados.js

# 3. Validar que no existan valores legacy
mongo mygestor_dev
> db.gastos.distinct('medioDePago')
> db.ventas.distinct('medioPago')
// Solo deben aparecer valores de MEDIOS_PAGO_UNIFICADO (todos con guiones bajos)
```

**Rollback:**
No recomendado (pérdida de semántica entre CHEQUE vs CHEQUE_TERCERO/CHEQUE_PROPIO).
Mejor estrategia: backup previo y restaurar si hay problemas.

---

## 🚀 Orden de Ejecución Recomendado

Para deployment en producción, ejecutar scripts en este orden:

### 1️⃣ **migracion-momento-cobro.js** (Fase 1)
```bash
node scripts/migracion-momento-cobro.js
```
- ✅ Establece defaults de `momentoCobro`
- ✅ Prerequisito para lógica de deuda en cuenta corriente
- ✅ Corrige deudas "fantasma" en ventas de contado

### 2️⃣ **migracion-estados-granulares.js** (Fase 2)
```bash
node scripts/migracion-estados-granulares.js
```
- ✅ Mapeo inteligente a 8 estados granulares
- ✅ Mejora visibilidad del ciclo completo de venta
- ✅ Habilita UI mejorada con emojis y sub-badges

### 3️⃣ **migracion-medios-pago-unificados.js** (Fase 2)
```bash
node scripts/migracion-medios-pago-unificados.js
```
- ✅ Normaliza enums de medios de pago
- ✅ Facilita reportes y consultas futuras
- ✅ Elimina inconsistencias entre tablas

### 4️⃣ **normalizar-capitalizacion.js** (Complementario a Fase 2)
```bash
node scripts/normalizar-capitalizacion.js
```
- ✅ Normaliza capitalización mixta (`Efectivo` → `EFECTIVO`)
- ✅ Unifica formatos (`Cheque Tercero` → `CHEQUE_TERCERO`)
- ✅ Actualiza Gastos, Ventas y ReciboPago
- ✅ Complementa la migración de medios de pago

**⚠️ IMPORTANTE - Checklist Antes de Producción:**
```bash
# 1. Backup completo
mongodump --uri="$MONGO_URI_PROD" --out=backup_$(date +%Y%m%d_%H%M%S)

# 2. Verificar variables de entorno
echo $MONGO_URI

# 3. Ejecutar scripts en orden (1 → 2 → 3)

# 4. Verificar resultados
mongo $DB_NAME
> db.ventas.find({ momentoCobro: { $exists: false } }).count()  // Debe ser 0
> db.ventas.find({ estadoGranular: { $exists: false } }).count() // Debe ser 0
> db.gastos.distinct('medioDePago') // Solo valores unificados (con guiones bajos)
```

---

## 📋 Scripts de Prueba AFIP

### 0. generar-datos-prueba.js
**Generador de datos de prueba - Crea clientes y productos**

Crea automáticamente en tu base de datos:
- ✅ 8 clientes de prueba (diferentes condiciones de IVA)
- ✅ 15 productos de prueba (diferentes categorías)

**Uso:**
```bash
node scripts/generar-datos-prueba.js
```

### 1. test-afip-conexion.js
**Script de diagnóstico - NO crea facturas**

Verifica que todo esté configurado correctamente:
- ✅ Variables de entorno
- ✅ Certificados AFIP
- ✅ Conexión con servidor AFIP
- ✅ Autenticación (Token de Acceso)
- ✅ Puntos de venta disponibles
- ✅ Últimos comprobantes autorizados

**Uso:**
```bash
node scripts/test-afip-conexion.js
```

### 2. test-afip-completo.js
**Script de prueba completo - Crea facturas de prueba**

Genera diferentes escenarios de facturación:

**Uso:**
```bash
node scripts/test-afip-completo.js [número]
```

**Escenarios disponibles:**

| Número | Descripción | Crea factura | Envía a AFIP |
|--------|-------------|--------------|--------------|
| 1 | Factura B (Monotributista) | ✅ | Opcional |
| 2 | Factura A (Responsable Inscripto) | ✅ | Opcional |
| 3 | Factura C (Consumidor Final) | ✅ | Opcional |
| 4 | Solo validación (todos los tipos) | ✅ | ❌ |
| 5 | Consultar últimos comprobantes | ❌ | N/A |
| 6 | Verificar estado del servidor | ❌ | N/A |
| 7 | Crear clientes de prueba | ❌ | N/A |
| 8 | Limpiar facturas de prueba | ❌ | N/A |

### 3. test-afip.js
**Script original - Factura de prueba básica**

Crea una factura de prueba simple.

**Uso:**
```bash
node scripts/test-afip.js
```

---

## 🚀 Guía de Uso Paso a Paso

### Paso 0: Generar Datos de Prueba (RECOMENDADO)

Primero, crea clientes y productos de prueba:

```bash
node scripts/generar-datos-prueba.js
```

**Esto creará:**
- 2 Responsables Inscriptos (para Facturas A)
- 2 Monotributistas (para Facturas B)  
- 3 Consumidores Finales (para Facturas C)
- 1 Exento
- 15 productos variados (notebooks, periféricos, servicios, software)

### Paso 1: Verificar Configuración

Antes de crear facturas, ejecuta el test de conexión:

```bash
node scripts/test-afip-conexion.js
```

**Resultado esperado:**
```
✅ Configuración          OK
✅ Certificados           OK
✅ Conexión servidor      OK
✅ Autenticación          OK
✅ Consulta comprobantes  OK
✅ Puntos de venta        OK

🎉 ¡TODO FUNCIONÓ CORRECTAMENTE!
```

Si algún test falla, revisa los mensajes de error.

---

### Paso 2: Crear Clientes de Prueba

Crea los 3 clientes de prueba en la base de datos:

```bash
node scripts/test-afip-completo.js 7
```

**Clientes creados:**
- Juan Pérez - CUIT 20123456789 - Monotributista
- María González - CUIT 30987654321 - Responsable Inscripto
- Carlos Rodríguez - DNI 12345678 - Consumidor Final

---

### Paso 3: Probar Facturación (Sin enviar a AFIP)

Primero, prueba solo la validación:

```bash
node scripts/test-afip-completo.js 4
```

Esto crea facturas de prueba y las valida, pero **NO las envía a AFIP**.

---

### Paso 4: Probar Factura Real con AFIP

**⚠️ IMPORTANTE:** Requiere certificados válidos de AFIP.

#### Opción A: Factura B (más común)
```bash
node scripts/test-afip-completo.js 1
```

#### Opción B: Factura A (con IVA)
```bash
node scripts/test-afip-completo.js 2
```

#### Opción C: Factura C (consumidor final)
```bash
node scripts/test-afip-completo.js 3
```

**Para enviar a AFIP:**
1. El script crea la factura y la valida
2. Te muestra todos los datos
3. Para solicitar el CAE, edita el script y descomenta la línea `await solicitarCAE(factura)`

---

### Paso 5: Limpiar Facturas de Prueba

Cuando termines de probar, limpia las facturas:

```bash
node scripts/test-afip-completo.js 8
```

---

## 🔧 Configuración Necesaria

### Variables de entorno (.env)

```bash
# AFIP Configuration
AFIP_CUIT=20123456789
AFIP_PRODUCTION=false
AFIP_CERT_PATH=./certs/cert.crt
AFIP_KEY_PATH=./certs/private.key
AFIP_TA_FOLDER=./afip_tokens
AFIP_PUNTO_VENTA=1
SDK_ACCESS_TOKEN=tu_token_del_sdk

# Empresa
EMPRESA_CUIT=20123456789
EMPRESA_RAZON_SOCIAL=Mi Empresa SA
EMPRESA_DOMICILIO=Av. Principal 123, Ciudad
EMPRESA_CONDICION_IVA=Responsable Inscripto
EMPRESA_IIBB=901-123456-7
EMPRESA_INICIO_ACTIVIDADES=2020-01-01

# MongoDB
MONGODB_URI=mongodb://localhost:27017/mygestor
```

### Certificados AFIP

Los certificados deben estar en la carpeta especificada en `AFIP_CERT_PATH` y `AFIP_KEY_PATH`.

**Para generar certificados de homologación:**

#### Opción 1: Usar SDK (automático)
```bash
npm run afip:generar-cert
```

El SDK te guiará para:
1. Ingresar tu CUIT
2. Elegir alias para el certificado (ej: "afipsdk")
3. Generar automáticamente cert.crt y private.key

#### Opción 2: Manual desde Portal AFIP
Ver guía completa en `FACTURACION_AFIP.md`

---

### ⚠️ IMPORTANTE: Autorizar Servicio WSFE

**Después de generar el certificado, DEBES autorizar el servicio WSFE en AFIP.**

#### Opción A: Autorización Automática (puede fallar con Error 500)
```bash
npm run afip:autorizar-servicio
```

Si obtienes **Error 500**, usa la Opción B.

#### Opción B: Autorización Manual desde Portal AFIP (RECOMENDADO)

1. **Ingresar a AFIP:**
   - URL: https://auth.afip.gob.ar/contribuyente_/login.xhtml
   - CUIT: tu CUIT
   - Clave Fiscal (nivel 3 o superior)

2. **Ubicar sección:**
   - Busca: **"Administrador de Relaciones de Clave Fiscal"**
   - O: **"Sistema Registral"** → **"Administración de Relaciones"**

3. **Autorizar WSFE:**
   - Click en **"Nueva Relación"** o **"Adherir Servicio"**
   - Buscar: **"wsfe"** o **"facturacion electronica"**
   - Seleccionar: **"Web Services - Facturación Electrónica"** (WSFE)
   - **MUY IMPORTANTE**: Marcar **HOMOLOGACIÓN** (ambiente de prueba)
   - Aceptar y confirmar

4. **Verificar puntos de venta:**
   - Ir a: **"Administración de Puntos de Venta Web Service"**
   - Verificar que existe al menos el **punto de venta 1**
   - Si no existe, crearlo

5. **Verificar que funcionó:**
   ```bash
   npm run afip:verificar-endpoints
   npm run afip:listar-puntos
   ```

**Síntomas de servicio NO autorizado:**
- Error 400 al autenticar
- Error 1552 (CUIT sin relación con servicio)
- `npm run afip:listar-puntos` falla

**Síntomas de servicio autorizado correctamente:**
- ✅ Autenticación exitosa
- ✅ Lista puntos de venta disponibles
- ✅ Consulta últimos comprobantes

---

## 📊 Interpretación de Resultados

### ✅ Éxito
```
✅ CAE OBTENIDO EXITOSAMENTE!

📋 Datos del comprobante:
   CAE: 12345678912345
   Número: 0001-00000123
   Fecha autorización: 2024-10-30
   Vencimiento CAE: 2024-11-09
```

### ❌ Error de Validación
```
❌ Factura INVÁLIDA:
   ❌ El CUIT del emisor es obligatorio
   ❌ La fecha no puede ser futura
```

### ❌ Error de AFIP
```
❌ FACTURA RECHAZADA POR AFIP

Errores:
   ❌ El punto de venta no existe
   ❌ Certificado vencido
```

---

## 🐛 Solución de Problemas

### Error: "Certificate not found"
**Causa:** No se encuentran los certificados.
**Solución:** 
1. Verifica que los archivos existan en la ruta configurada
2. Revisa `AFIP_CERT_PATH` y `AFIP_KEY_PATH` en `.env`

### Error: "CUIT not authorized"
**Causa:** El CUIT no está habilitado para facturación electrónica o el servicio WSFE no está autorizado.

**Solución:**
1. Accede al portal de AFIP: https://auth.afip.gob.ar
2. Ve a **"Administrador de Relaciones de Clave Fiscal"**
3. Click en **"Nueva Relación"** o **"Adherir Servicio"**
4. Busca y selecciona: **"Web Services - Facturación Electrónica"** (WSFE)
5. **IMPORTANTE**: Marca **HOMOLOGACIÓN** (ambiente de prueba)
6. Confirma la autorización
7. Verifica con: `npm run afip:verificar-endpoints`

**Nota:** La autorización automática con `npm run afip:autorizar-servicio` puede fallar con Error 500. En ese caso, usa el método manual del portal.

### Error: "Punto de venta no existe"
**Causa:** El punto de venta no está creado en AFIP.
**Solución:**
1. Accede a "Comprobantes en línea" en AFIP
2. Crea un nuevo punto de venta
3. Actualiza `AFIP_PUNTO_VENTA` en `.env`

### Error: "Connection timeout"
**Causa:** No hay conexión con el servidor de AFIP.
**Solución:**
1. Verifica tu conexión a internet
2. Verifica que no haya firewall bloqueando
3. AFIP puede estar en mantenimiento (probar más tarde)

### Factura válida pero no llega el CAE
**Causa:** Múltiples posibles razones.
**Solución:**
1. Ejecuta: `node scripts/test-afip-conexion.js`
2. Revisa todos los tests
3. Verifica el log completo de errores

---

## 📚 Datos de Prueba

### Clientes de Prueba

```javascript
// Cliente 1: Monotributista (genera Factura B)
{
  CUIT: '20123456789',
  Razón Social: 'Juan Pérez',
  Condición IVA: 'Monotributista'
}

// Cliente 2: Responsable Inscripto (genera Factura A)
{
  CUIT: '30987654321',
  Razón Social: 'González SA',
  Condición IVA: 'Responsable Inscripto'
}

// Cliente 3: Consumidor Final (genera Factura C)
{
  DNI: '12345678',
  Nombre: 'Carlos Rodríguez',
  Condición IVA: 'Consumidor Final'
}
```

### Productos de Prueba

```javascript
[
  {
    codigo: 'PROD001',
    descripcion: 'Notebook Dell Inspiron 15',
    cantidad: 1,
    precio: $150,000
  },
  {
    codigo: 'PROD002',
    descripcion: 'Mouse Logitech MX Master 3',
    cantidad: 2,
    precio: $15,000 c/u
  },
  {
    codigo: 'SERV001',
    descripcion: 'Instalación y configuración',
    cantidad: 1,
    precio: $10,000
  }
]
```

---

## 🎯 Flujo Recomendado para Primera Vez

```bash
# 0. Generar certificado AFIP (si no lo tienes)
npm run afip:generar-cert

# IMPORTANTE: Autorizar WSFE en portal AFIP manualmente
# Ver sección "Autorizar Servicio WSFE" arriba
# URL: https://auth.afip.gob.ar/contribuyente_/login.xhtml
# Buscar: "Administrador de Relaciones" → "Nueva Relación" → "WSFE"
# Marcar: HOMOLOGACIÓN

# 1. Verificar que la autorización funcionó
npm run afip:verificar-endpoints
npm run afip:listar-puntos

# 2. Generar datos de prueba (clientes y productos)
node scripts/generar-datos-prueba.js

# 3. Crear clientes adicionales (opcional)
node scripts/test-afip-completo.js 7

# 4. Validar facturas (sin enviar a AFIP)
node scripts/test-afip-completo.js 4

# 5. Ver últimos comprobantes
node scripts/test-afip-completo.js 5

# 6. Probar factura real (con certificados válidos)
node scripts/test-afip-completo.js 1

# 7. Limpiar cuando termines
node scripts/test-afip-completo.js 8
```

---

## 📝 Notas Importantes

- **Ambiente de prueba:** Todos los scripts usan HOMOLOGACIÓN por defecto
- **Facturas de prueba:** Se marcan con `usuarioCreador: 'test-script'`
- **Limpieza:** El escenario 8 elimina solo las facturas creadas por scripts
- **MongoDB:** Debes tener MongoDB corriendo y conectado
- **Certificados:** Deben ser válidos para el ambiente (homologación o producción)

---

## 🔗 Enlaces Útiles

- [Portal AFIP](https://www.afip.gob.ar/)
- [Documentación SDK](https://github.com/AfipSDK/afip.js)
- [Guía completa](../FACTURACION_AFIP.md)
- [Solicitar certificados](https://www.afip.gob.ar/ws/documentacion/certificados.asp)

---

## 📞 Soporte

Si tienes problemas:
1. Lee los mensajes de error completos
2. Ejecuta `test-afip-conexion.js` para diagnóstico
3. Revisa la documentación en `FACTURACION_AFIP.md`
4. Verifica la configuración en `.env`
