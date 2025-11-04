# 🚀 Guía Rápida: Probar Integración AFIP

Esta guía te ayudará a probar paso a paso la integración con AFIP para facturación electrónica.

---

## ⚡ Inicio Rápido (5 minutos)

```bash
# 1. Generar datos de prueba
cd backend
node scripts/generar-datos-prueba.js

# 2. Verificar conexión AFIP
node scripts/test-afip-conexion.js

# 3. Crear factura de validación (sin enviar a AFIP)
node scripts/test-afip-completo.js 4
```

Si todo sale bien, ¡ya estás listo para facturar! 🎉

---

## 📝 Guía Completa Paso a Paso

### 1️⃣ Preparar el Entorno

Asegúrate de tener configurado tu archivo `.env`:

```bash
# AFIP - Facturación Electrónica
AFIP_CUIT=20123456789                    # Tu CUIT
AFIP_PRODUCTION=false                     # false = Homologación
AFIP_CERT_PATH=./certs/cert.crt          # Ruta al certificado
AFIP_KEY_PATH=./certs/private.key        # Ruta a la clave privada
AFIP_PUNTO_VENTA=1                       # Número de punto de venta

# Empresa
EMPRESA_CUIT=20123456789
EMPRESA_RAZON_SOCIAL=Mi Empresa SA
EMPRESA_DOMICILIO=Av. Principal 123, Ciudad
EMPRESA_CONDICION_IVA=Responsable Inscripto
```

**🔑 Certificados AFIP:**
- Para homologación (testing): Sigue la guía en `FACTURACION_AFIP.md`
- Los certificados deben estar en la carpeta especificada

---

### 2️⃣ Generar Datos de Prueba

Este script crea todo lo que necesitas para probar:

```bash
node scripts/generar-datos-prueba.js
```

**Crea automáticamente:**

**Clientes (8 totales):**
- ✅ 2 Responsables Inscriptos → Generan Factura A
- ✅ 2 Monotributistas → Generan Factura B
- ✅ 3 Consumidores Finales → Generan Factura C
- ✅ 1 Exento → Generan Factura A sin IVA

**Productos (15 totales):**
- 📱 5 productos de tecnología (notebooks, mouse, teclado, etc.)
- 🛠️ 3 servicios (instalación, soporte, mantenimiento)
- 🔌 4 accesorios (cables, pendrives, webcam, etc.)
- 💿 3 licencias de software (Windows, Office, antivirus)

**Resultado esperado:**
```
✅ Clientes creados: 8
✅ Productos creados: 15
✅ Datos listos para usar
```

---

### 3️⃣ Verificar Conexión con AFIP

**Sin certificados válidos:**
```bash
node scripts/test-afip-conexion.js
```

Este script verifica:
- ✅ Configuración (variables .env)
- ✅ Certificados (existen los archivos)
- ✅ Conexión servidor AFIP
- ⏸️ Autenticación (requiere certificados válidos)
- ⏸️ Consultas AFIP (requiere autenticación)

**Resultado esperado (sin certificados):**
```
✅ Configuración          OK
✅ Certificados           OK (archivos existen)
✅ Conexión servidor      OK
❌ Autenticación          FALLÓ (sin certificados válidos)
```

**Con certificados válidos:**
```
✅ Configuración          OK
✅ Certificados           OK
✅ Conexión servidor      OK
✅ Autenticación          OK
✅ Consulta comprobantes  OK
✅ Puntos de venta        OK
```

---

### 4️⃣ Crear Facturas de Prueba (Solo Validación)

**Este paso NO envía nada a AFIP**, solo valida que las facturas estén bien formadas:

```bash
node scripts/test-afip-completo.js 4
```

**Qué hace:**
- Crea 3 facturas (una de cada tipo: A, B, C)
- Las valida según reglas de AFIP
- Las guarda en la base de datos como "borrador"
- **NO las envía a AFIP**

**Resultado esperado:**
```
✅ Factura B creada y validada
✅ Factura A creada y validada
✅ Factura C creada y validada

✅ Todas las validaciones pasaron
```

---

### 5️⃣ Consultar Información de AFIP (Requiere certificados)

**Ver últimos comprobantes autorizados:**
```bash
node scripts/test-afip-completo.js 5
```

**Ver estado del servidor AFIP:**
```bash
node scripts/test-afip-completo.js 6
```

**Resultado esperado:**
```
Factura A            → 0001-00000042
Factura B            → 0001-00000128
Factura C            → 0001-00000015
```

---

### 6️⃣ Solicitar CAE Real (Requiere certificados válidos)

**⚠️ IMPORTANTE:** Este paso SÍ envía facturas a AFIP.

**Opción A - Factura B (Monotributista):**
```bash
node scripts/test-afip-completo.js 1
```

**Opción B - Factura A (Responsable Inscripto):**
```bash
node scripts/test-afip-completo.js 2
```

**Opción C - Factura C (Consumidor Final):**
```bash
node scripts/test-afip-completo.js 3
```

**Qué hace:**
1. Crea la factura
2. La valida
3. Muestra un mensaje de confirmación
4. Para enviar a AFIP, edita el script y descomenta `await solicitarCAE(factura)`

**Resultado esperado (con CAE):**
```
✅ CAE OBTENIDO EXITOSAMENTE!

📋 Datos del comprobante:
   CAE: 72345678912345
   Número: 0001-00000129
   Fecha autorización: 2024-10-30
   Vencimiento CAE: 2024-11-09
```

---

### 7️⃣ Limpiar Facturas de Prueba

Cuando termines de probar:

```bash
node scripts/test-afip-completo.js 8
```

**Qué hace:**
- Elimina SOLO las facturas creadas por los scripts de prueba
- No afecta facturas creadas manualmente desde la aplicación

---

## 🔧 Resolver Problemas Comunes

### ❌ Error: "Certificate not found"

**Causa:** Los archivos de certificado no existen.

**Solución:**
1. Verifica las rutas en `.env`: `AFIP_CERT_PATH` y `AFIP_KEY_PATH`
2. Genera certificados siguiendo `FACTURACION_AFIP.md`

---

### ❌ Error: "CUIT not authorized"

**Causa:** Tu CUIT no está habilitado para facturación electrónica en AFIP.

**Solución:**
1. Ingresa a [AFIP](https://www.afip.gob.ar/)
2. Ve a "Administrador de Relaciones"
3. Busca "Facturación Electrónica"
4. Habilita el servicio

---

### ❌ Error: "Punto de venta no existe"

**Causa:** El número de punto de venta no está creado en AFIP.

**Solución:**
1. Ingresa a [Comprobantes en línea](https://www.afip.gob.ar/)
2. Crea un nuevo punto de venta
3. Actualiza `AFIP_PUNTO_VENTA` en tu `.env`

---

### ❌ Factura válida pero no llega el CAE

**Posibles causas:**
- Certificado expirado o inválido
- CUIT sin permisos de facturación
- Punto de venta bloqueado o inexistente
- Datos incorrectos en la factura

**Solución:**
```bash
# Ejecutar diagnóstico completo
node scripts/test-afip-conexion.js
```

Revisa cada error específico que reporte el script.

---

## 📊 Escenarios de Prueba Disponibles

| Comando | Descripción | ¿Crea factura? | ¿Envía a AFIP? |
|---------|-------------|----------------|----------------|
| `generar-datos-prueba.js` | Crea clientes y productos | ❌ | ❌ |
| `test-afip-conexion.js` | Diagnóstico completo | ❌ | ❌ |
| `test-afip-completo.js 1` | Factura B (Monotributista) | ✅ | Opcional |
| `test-afip-completo.js 2` | Factura A (Resp. Inscripto) | ✅ | Opcional |
| `test-afip-completo.js 3` | Factura C (Consumidor Final) | ✅ | Opcional |
| `test-afip-completo.js 4` | Solo validación (todos los tipos) | ✅ | ❌ |
| `test-afip-completo.js 5` | Consultar últimos comprobantes | ❌ | N/A |
| `test-afip-completo.js 6` | Estado del servidor | ❌ | N/A |
| `test-afip-completo.js 7` | Crear clientes adicionales | ❌ | ❌ |
| `test-afip-completo.js 8` | Limpiar facturas de prueba | ❌ | ❌ |

---

## 🎓 Entender los Tipos de Factura

### Factura A
- **Cliente:** Responsable Inscripto
- **IVA:** Discriminado (se ve separado del precio)
- **Ejemplo:** Empresa que vende a otra empresa

### Factura B
- **Cliente:** Monotributista o Exento
- **IVA:** No discriminado (incluido en el precio)
- **Ejemplo:** Empresa que vende a un monotributista

### Factura C
- **Cliente:** Consumidor Final
- **IVA:** No corresponde
- **Ejemplo:** Venta al público general

---

## 💡 Consejos

1. **Siempre usa `test-afip-conexion.js` primero** para verificar que todo esté bien configurado.

2. **Prueba con validación (escenario 4) antes de enviar a AFIP** para asegurarte de que las facturas estén bien formadas.

3. **En homologación (testing)**, puedes hacer todas las pruebas que quieras sin afectar tu producción.

4. **Los CAE en homologación NO son válidos** para facturas reales, solo para testing.

5. **Guarda los datos de prueba**, son útiles para testear otras funcionalidades de tu sistema.

---

## 📚 Documentación Adicional

- **Guía completa AFIP:** Ver `FACTURACION_AFIP.md`
- **Scripts detallados:** Ver `scripts/README.md`
- **Portal AFIP:** https://www.afip.gob.ar/
- **Documentación SDK:** https://github.com/AfipSDK/afip.js

---

## ✅ Checklist de Éxito

Marca cada paso a medida que lo completes:

- [ ] Configurar variables en `.env`
- [ ] Generar certificados AFIP (homologación)
- [ ] Ejecutar `generar-datos-prueba.js` ✅
- [ ] Ejecutar `test-afip-conexion.js` ✅
- [ ] Ver todos los tests en verde
- [ ] Crear facturas de validación (escenario 4) ✅
- [ ] Consultar últimos comprobantes (escenario 5) ✅
- [ ] Obtener primer CAE de prueba ✅

**Una vez completado, tu sistema está listo para facturar electrónicamente! 🎉**
