# Análisis Profundo: Problema de Cálculo de IVA en Facturación AFIP

## 🔴 PROBLEMA PRINCIPAL IDENTIFICADO

### Inconsistencia entre Venta y Factura en el cálculo de IVA

---

## 📊 FLUJO ACTUAL DEL SISTEMA

### 1️⃣ MODELO CLIENTE (`Cliente.ts`)

```typescript
condicionIVA: 'Responsable Inscripto' | 'Monotributista' | 'Exento' | 'Consumidor Final'
aplicaIVA: boolean  // ⚠️ Campo sugerencia, NO obligatorio
```

**Valores en BD:**
- `condicionIVA`: Estado fiscal del cliente ante AFIP
- `aplicaIVA`: Indica si el cliente **frecuentemente** opera con IVA

**❌ Problema**: `aplicaIVA` del cliente es solo una **sugerencia inicial**, pero el usuario puede decidir diferente en cada venta.

---

### 2️⃣ MODELO VENTA (`Venta.ts`)

```typescript
aplicaIVA: boolean  // ✅ Decisión por transacción
iva: number         // IVA calculado = (subtotal - descuento) * 0.21
total: number       // = subtotal - descuento + iva
```

**Middleware pre-save:**
```typescript
if (this.aplicaIVA) {
  this.iva = (this.subtotal - this.descuentoTotal) * 0.21;
} else {
  this.iva = 0;
}
this.total = this.subtotal - this.descuentoTotal + this.iva;
```

**✅ Correcto**: La venta tiene su propio `aplicaIVA` independiente del cliente.

---

### 3️⃣ FACTURACIÓN (`facturacionController.ts` - ANTES DEL FIX)

```typescript
// ❌ LÓGICA INCORRECTA:
const tipoComprobante = determinarTipoFactura(empresa, cliente);
const discriminaIVA = tipoComprobante === 'FACTURA_A' || 'FACTURA_B';
const alicuotaIVA = discriminaIVA ? 21 : 0;

// Recalcula IVA ignorando venta.iva
const importeIVA = discriminaIVA 
  ? AFIPServiceSOAP.calcularIVA(importeNeto, 21)
  : 0;
```

**❌ Problemas:**
1. **Ignora** `venta.aplicaIVA` (decisión del usuario)
2. **Recalcula** IVA desde cero
3. **Asume** que tipo de factura = presencia de IVA
4. **Falla** cuando cliente tiene CUIT pero es Consumidor Final

---

## 🔧 SOLUCIÓN IMPLEMENTADA

### Cambios en `facturacionController.ts`

```typescript
// ✅ NUEVA LÓGICA:
const discriminaIVA = venta.aplicaIVA && (tipoComprobante === 'FACTURA_A' || 'FACTURA_B');
const alicuotaIVA = venta.aplicaIVA ? 21 : 0;

// Usa el IVA ya calculado en la venta
const totalVentaSinIVA = venta.total - venta.iva;
const ivaProporcion = (importeNeto / totalVentaSinIVA) * venta.iva;
const importeIVA = discriminaIVA ? ivaProporcion : 0;
```

**✅ Beneficios:**
1. **Respeta** la decisión del usuario (`venta.aplicaIVA`)
2. **Preserva** el IVA calculado en la venta
3. **Distribuye** proporcionalmente el IVA entre items
4. **Consistencia** total entre venta y factura

---

## 📋 MATRIZ DE ESCENARIOS

### Caso 1: RI + RI con IVA
```
Cliente: Responsable Inscripto (CUIT)
Venta: aplicaIVA = true, iva = $72,450
Factura: Tipo A (discrimina IVA)
AFIP: ✅ Acepta
- DocTipo: 80 (CUIT)
- IVA: $72,450
- Total: $417,450
```

### Caso 2: RI + Consumidor Final CON IVA (Factura con IVA)
```
Cliente: Consumidor Final (DNI)
Venta: aplicaIVA = true, iva = $72,450
Factura: Tipo B (discrimina IVA)
AFIP: ✅ Acepta
- DocTipo: 96 (DNI)
- IVA: $72,450 (discriminado)
- Total: $417,450
```

### Caso 3: RI + Consumidor Final SIN IVA (Precio final)
```
Cliente: Consumidor Final (DNI)
Venta: aplicaIVA = false, iva = $0
Factura: Tipo B (pero sin discriminar porque venta.aplicaIVA = false)
AFIP: ✅ Acepta
- DocTipo: 96 (DNI)
- IVA: $0
- Total: $345,000 (precio final sin IVA)
```

### Caso 4: ⚠️ PROBLEMÁTICO - CUIT marcado como Consumidor Final
```
Cliente: Consumidor Final (CUIT 20-94701147-3) ← ERROR DE DATOS
Venta: aplicaIVA = true, iva = $72,450
Factura: Tipo C (por Consumidor Final)
AFIP: ❌ RECHAZA
- DocTipo: 80 (CUIT)
- Comprobante: 11 (Factura C)
- Error: Inconsistencia tipo doc vs tipo factura
```

**Solución**: Actualizar `cliente.condicionIVA` a 'Responsable Inscripto' o 'Monotributista'.

---

## 🎯 TABLA DE TIPOS DE FACTURA POR CONDICIÓN IVA

| Empresa       | Cliente                  | Factura | Discrimina IVA | DocTipo   |
|---------------|--------------------------|---------|----------------|-----------|
| RI            | RI                       | A       | ✅ Sí          | 80 (CUIT) |
| RI            | Monotributista           | B       | ✅ Sí          | 80 (CUIT) |
| RI            | Consumidor Final         | B       | ✅ Sí          | 96 (DNI)  |
| RI            | Exento                   | B       | ✅ Sí          | 80/96     |
| Monotributo   | Cualquiera               | C       | ❌ No          | Cualquiera|
| No RI         | Cualquiera               | C       | ❌ No          | Cualquiera|

**Clave:**
- **Factura A**: Discrimina IVA (solo RI a RI)
- **Factura B**: Discrimina IVA (RI a no-RI)
- **Factura C**: **NO** discrimina IVA (precio final)

---

## ⚠️ VALIDACIONES AGREGADAS

### 1. Validación de consistencia Cliente
```typescript
if ((cliente.tipoDocumento === 'CUIT' || cliente.tipoDocumento === 'CUIL') && 
    cliente.condicionIVA === 'Consumidor Final') {
  console.warn('ADVERTENCIA: CUIT/CUIL marcado como Consumidor Final');
  console.warn('Considere actualizar condicionIVA');
}
```

### 2. Logs de depuración
```typescript
console.log('🏢 EMPRESA condicionIVA:', EMPRESA.condicionIVA);
console.log('👤 CLIENTE condicionIVA:', cliente.condicionIVA);
console.log('💰 VENTA aplicaIVA:', venta.aplicaIVA);
console.log('💰 VENTA iva:', venta.iva);
console.log('📄 Tipo comprobante:', tipoComprobante);
console.log('💰 Discrimina IVA:', discriminaIVA);
console.log('💰 Alícuota IVA:', alicuotaIVA);
```

---

## 🔍 CONVERSIÓN DE CONDICIÓN IVA PARA AFIP

### Mapeo strings → códigos AFIP
```typescript
RESPONSABLE_INSCRIPTO → 1
MONOTRIBUTO → 6
CONSUMIDOR_FINAL → 5
EXENTO → 3
```

### ⚠️ IMPORTANTE: Inconsistencia en nombres
- **Cliente.ts**: `'Responsable Inscripto'` (con espacio y mayúsculas)
- **AFIPServiceSOAP**: `'RESPONSABLE_INSCRIPTO'` (snake_case mayúsculas)

**Solución actual**: Método `convertirCondicionIVA()` normaliza con `.toUpperCase().replace(/\s+/g, '_')`

---

## ✅ CHECKLIST DE VALIDACIÓN

Antes de facturar, verificar:

- [ ] Cliente tiene `condicionIVA` correcta según su tipo de documento
  - CUIT/CUIL → 'Responsable Inscripto' o 'Monotributista'
  - DNI → 'Consumidor Final' (generalmente)
  
- [ ] Venta tiene `aplicaIVA` según lo acordado con el cliente
  - `true` → Factura con IVA discriminado
  - `false` → Factura precio final sin IVA
  
- [ ] Empresa tiene `EMPRESA_CONDICION_IVA` configurada
  - Si RI → puede emitir A/B/C
  - Si Monotributo → solo C
  
- [ ] Logs muestran:
  - Tipo comprobante correcto (A/B/C)
  - Discrimina IVA = true cuando corresponde
  - IVA calculado > 0 si venta.aplicaIVA = true

---

## 🚀 PRÓXIMOS PASOS

1. **Limpiar datos**: Actualizar clientes con CUIT que tienen `condicionIVA = 'Consumidor Final'`
   ```sql
   db.clientes.find({ 
     tipoDocumento: { $in: ['CUIT', 'CUIL'] }, 
     condicionIVA: 'Consumidor Final' 
   })
   ```

2. **Validación en frontend**: Agregar warning cuando usuario selecciona CUIT + Consumidor Final

3. **Enum centralizado**: Migrar `condicionIVA` del Cliente a usar enum de Types.ts

4. **Tests unitarios**: Crear tests para cada escenario de facturación

---

## 📝 NOTAS TÉCNICAS

### Estructura XML correcta para AFIP (RG 5616)
```xml
<ar:FECAEDetRequest>
  <ar:Concepto>1</ar:Concepto>
  <ar:DocTipo>80</ar:DocTipo>
  <ar:DocNro>20947011473</ar:DocNro>
  <!-- ... montos ... -->
  <ar:ImpIVA>72450</ar:ImpIVA>
  <ar:Iva>
    <ar:AlicIva>
      <ar:Id>5</ar:Id>          <!-- 5 = 21% -->
      <ar:BaseImp>345000</ar:BaseImp>
      <ar:Importe>72450</ar:Importe>
    </ar:AlicIva>
  </ar:Iva>
  <ar:Compradores>
    <ar:Comprador>
      <ar:DocTipo>80</ar:DocTipo>
      <ar:DocNro>20947011473</ar:DocNro>
      <ar:IvaCondicion>1</ar:IvaCondicion>  <!-- 1 = RI -->
    </ar:Comprador>
  </ar:Compradores>
</ar:FECAEDetRequest>
```

### Códigos de alícuota IVA
- 3 = 0% (No gravado)
- 4 = 10.5%
- 5 = 21%
- 6 = 27%
- 8 = 5%
- 9 = 2.5%

---

**Fecha análisis**: 21 de noviembre de 2025  
**Versión**: 1.0  
**Estado**: ✅ Solucionado con logs de depuración activos
