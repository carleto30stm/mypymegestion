# Scripts de Prueba AFIP

Esta carpeta contiene scripts para probar la integración con AFIP (Facturación Electrónica).

## 📋 Scripts Disponibles

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
Ver guía completa en `FACTURACION_AFIP.md`

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
**Causa:** El CUIT no está habilitado para facturación electrónica.
**Solución:**
1. Accede al portal de AFIP
2. Ve a "Administrador de Relaciones"
3. Habilita "Facturación Electrónica"

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
# 0. Generar datos de prueba (clientes y productos)
node scripts/generar-datos-prueba.js

# 1. Verificar que todo esté configurado
node scripts/test-afip-conexion.js

# 2. Crear clientes adicionales (opcional, ya tenés de generar-datos-prueba.js)
node scripts/test-afip-completo.js 7

# 3. Validar facturas (sin enviar a AFIP)
node scripts/test-afip-completo.js 4

# 4. Ver últimos comprobantes
node scripts/test-afip-completo.js 5

# 5. Probar factura real (con certificados válidos)
node scripts/test-afip-completo.js 1

# 6. Limpiar cuando termines
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
