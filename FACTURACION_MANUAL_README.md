# Facturación Manual - Guía de Uso

## ✅ Estado de Implementación

**COMPLETADO** - La funcionalidad de facturación manual está implementada y lista para usar.

## 📋 Descripción

La facturación manual permite crear facturas AFIP sin necesidad de tener una venta previa registrada en el sistema. Es útil para:
- Facturar servicios prestados no registrados como ventas
- Crear facturas para clientes externos
- Facturación de conceptos mixtos (productos + servicios)
- Ajustes o correcciones contables

## 🚀 Cómo Usar

### 1. Acceso

1. Ir a **Facturación** en el menú principal
2. Click en botón **"Nueva Factura"**
3. Seleccionar tab **"Manual"**

### 2. Completar Formulario

#### A. Datos del Cliente
- **Cliente**: Buscar por nombre, razón social o documento
  - El sistema consultará automáticamente AFIP para determinar el tipo de factura (A, B o C)
  - Se usa la condición IVA REAL del padrón AFIP, no la guardada localmente

#### B. Configuración de la Factura
- **Concepto**: Seleccionar tipo de factura
  - `Productos`: Venta de bienes físicos
  - `Servicios`: Prestación de servicios
  - `Productos y Servicios`: Mixto (ambos)
- **Observaciones**: Notas adicionales opcionales

#### C. Items de Factura
Cada item requiere:
- **Código**: Código del producto/servicio (opcional)
- **Descripción**: Detalle del item (obligatorio)
- **Cantidad**: Unidades a facturar (obligatorio, mínimo 1)
- **Precio Unitario**: Precio por unidad **en formato argentino** (obligatorio)
  - Formato: `1.000,50` (punto para miles, coma para decimales)
  - Ejemplo: `350.000,00` para $350.000
  - ❌ NO usar: `350000` o `350,000.00`
- **IVA %**: Alícuota de IVA aplicable
  - `0%`: Exento
  - `10,5%`: IVA reducido
  - `21%`: IVA general (por defecto)
  - `27%`: IVA incrementado

**Acciones:**
- Click **"Agregar Item"** para añadir más líneas
- Click ícono 🗑️ para eliminar item (mínimo 1 item requerido)

### 3. Revisión de Totales

El sistema calcula automáticamente:
- **Subtotal**: Suma de todos los items sin IVA
- **IVA Total**: Suma de IVA de todos los items
- **Total Factura**: Subtotal + IVA Total

### 4. Crear Factura

1. Verificar que todos los campos obligatorios estén completos
2. Click **"Crear Factura Manual"**
3. El sistema:
   - Consulta AFIP para determinar tipo de factura correcto
   - Crea factura en estado **"borrador"**
   - Valida datos del cliente según requisitos AFIP

### 5. Autorizar en AFIP

Una vez creada la factura en borrador:
1. Ir a listado de facturas
2. Buscar la factura creada (estado "borrador")
3. Click botón **"Autorizar"**
4. El sistema solicitará CAE a AFIP
5. Si es aprobada: estado cambia a **"autorizada"**
6. Si es rechazada: revisar errores y corregir datos del cliente

## ⚠️ Validaciones Automáticas

### Frontend
- Cliente seleccionado
- Al menos 1 item con descripción
- Cantidad > 0 en todos los items
- Precio unitario > 0 en todos los items
- Formato correcto de montos (argentino con coma decimal)

### Backend
- Cliente existe y tiene datos completos
- Consulta AFIP para condición IVA actualizada
- Tipo de documento correcto según padrón AFIP:
  - Si cliente es Consumidor Final: usa DNI (96) en lugar de CUIT (80)
  - Previene error AFIP 10015 "DocNro no registrado en padrones"

## 📊 Ejemplo Práctico

### Caso: Facturar servicio de consultoría

1. **Cliente**: Juan Pérez (DNI 12345678 - Consumidor Final)
2. **Concepto**: Servicios
3. **Item 1**:
   - Código: `CONS001`
   - Descripción: `Consultoría técnica - 4 horas`
   - Cantidad: `4`
   - Precio Unit.: `25.000,00`
   - IVA: `21%`
4. **Totales calculados**:
   - Subtotal: $100.000,00
   - IVA (21%): $21.000,00
   - **Total: $121.000,00**
5. **Resultado**: Se crea Factura C (Consumidor Final) en borrador
6. **Autorización**: Al autorizar, AFIP emite CAE y genera número de comprobante

## 🔍 Notas Importantes

### Formato de Montos
✅ **CORRECTO**:
- `1.000,00` (mil pesos)
- `350.000,00` (trescientos cincuenta mil)
- `25.500,50` (veinticinco mil quinientos con cincuenta)

❌ **INCORRECTO**:
- `1,000.00` (formato inglés)
- `1000` (sin separador de miles ni decimales)
- `350000.00` (sin puntos de miles)

### Tipo de Factura
El sistema determina automáticamente:
- **Factura A**: Responsable Inscripto → Responsable Inscripto
- **Factura B**: Responsable Inscripto → Monotributista/Exento
- **Factura C**: Responsable Inscripto → Consumidor Final

**Importante**: NO se usa la condición IVA guardada en el cliente. El sistema consulta el padrón AFIP en tiempo real para obtener la condición actualizada.

### Campos Calculados Automáticamente
No es necesario calcular manualmente:
- `importeBruto`: precio × cantidad
- `importeNeto`: importeBruto - descuento (sin descuentos en v1)
- `importeIVA`: importeNeto × (alicuotaIVA / 100)
- `importeTotal`: importeNeto + importeIVA

## 🐛 Solución de Problemas

### Error: "Cliente y items son requeridos"
- Verificar que seleccionó un cliente
- Verificar que agregó al menos 1 item

### Error: "Debe tener una descripción"
- Completar el campo Descripción en todos los items

### Error: "Precio unitario mayor a 0"
- Ingresar un precio válido en formato argentino (ej: `1.000,00`)
- No dejar campos de precio vacíos

### Error AFIP: "DocNro no se encuentra registrado en padrones"
- El cliente tiene CUIT pero no está en padrón AFIP
- Solución automática: sistema cambia tipo documento a DNI (96)
- Si persiste: verificar que el CUIT/DNI del cliente sea correcto

### Error AFIP: "Configuración de empresa incompleta"
- Verificar variables de entorno en backend:
  - `EMPRESA_CUIT`
  - `EMPRESA_RAZON_SOCIAL`
  - `EMPRESA_DOMICILIO`
  - `AFIP_CERT_PATH` y `AFIP_KEY_PATH`

## 📚 Archivos Modificados

### Frontend
- `frontend/components/CrearFacturaDialog.tsx`: Formulario completo de facturación manual
- `frontend/redux/slices/facturasSlice.ts`: Actualizado thunk `crearFacturaManual` con campos completos
- `frontend/services/api.ts`: Actualizado `facturasAPI.crearManual` con tipos correctos

### Backend (ya existentes)
- `backend/src/controllers/facturacionController.ts`: Endpoint `crearFacturaManual`
- `backend/src/routes/facturacionRoutes.ts`: Ruta `/api/facturacion/manual`
- `backend/src/models/Factura.ts`: Modelo de factura con validaciones

## 🎯 Próximos Pasos (Opcional)

### Mejoras Futuras
1. **Descuentos por item**: Agregar campo `descuento` en formulario
2. **Fechas de servicio**: Para concepto "Servicios" agregar fechaDesde/fechaHasta
3. **Otros tributos**: Percepción IVA, IIBB, tasas municipales
4. **Plantillas de items**: Guardar items frecuentes para reutilizar
5. **Importar desde Excel**: Cargar múltiples items desde archivo

## 📞 Soporte

Para reportar bugs o solicitar mejoras, contactar al administrador del sistema.

---

**Última actualización**: 2025-01-10
**Versión**: 1.0.0
