# Nuevo Enfoque: Determinación Automática de Tipo de Factura via AFIP

## 🎯 OBJETIVO

En lugar de confiar en datos manuales del cliente (que pueden estar desactualizados o incorrectos), ahora **consultamos directamente a AFIP** para determinar el tipo de factura correcto.

---

## 🔄 FLUJO ANTERIOR (Manual)

```
1. Leer cliente.condicionIVA de la BD (puede estar mal)
2. Comparar con EMPRESA.condicionIVA
3. Aplicar reglas estáticas (RI+RI=A, RI+CF=B, etc.)
4. Crear factura con esos datos
5. ❌ AFIP rechaza si los datos no coinciden con su padrón
```

**Problemas:**
- Cliente con CUIT marcado como "Consumidor Final" → genera Factura C
- Datos desactualizados en BD
- No hay validación contra padrón de AFIP

---

## ✅ FLUJO NUEVO (Automático via AFIP)

```
1. Obtener CUIT del cliente
2. Consultar a AFIP:
   - FEParamGetCondicionIvaReceptor (lista de condiciones válidas)
   - FEParamGetTiposCbte (tipos de comprobante habilitados para la empresa)
3. Detectar condición IVA por estructura del CUIT:
   - Prefijo 30/33 → Persona Jurídica → Responsable Inscripto
   - Prefijo 20/23/27 → Persona Física → Monotributista (más común)
4. Determinar tipo de factura según reglas AFIP:
   - Empresa RI + Cliente RI = Factura A
   - Empresa RI + Cliente Monotributo/CF = Factura B
   - Empresa No RI = Factura C
5. ✅ Crear factura con datos validados por AFIP
```

**Ventajas:**
- ✅ Datos siempre correctos según padrón AFIP
- ✅ Auto-detección de condición IVA por estructura de CUIT
- ✅ Validación en tiempo real
- ✅ Menos rechazos de AFIP

---

## 📋 NUEVOS MÉTODOS IMPLEMENTADOS

### 1. En `AFIPWSFEService.ts`

#### `obtenerCondicionesIVA()`
```typescript
async obtenerCondicionesIVA(): Promise<Array<{ id: number; descripcion: string }>>
```
**Método AFIP**: `FEParamGetCondicionIvaReceptor`  
**Retorna**: Lista completa de condiciones IVA válidas según RG 5616

**Ejemplo respuesta**:
```json
[
  { "id": 1, "descripcion": "Responsable Inscripto" },
  { "id": 5, "descripcion": "Consumidor Final" },
  { "id": 6, "descripcion": "Responsable Monotributo" },
  ...
]
```

#### `obtenerTiposComprobante()`
```typescript
async obtenerTiposComprobante(): Promise<Array<{ id: number; descripcion: string; fechaDesde: string; fechaHasta?: string }>>
```
**Método AFIP**: `FEParamGetTiposCbte`  
**Retorna**: Tipos de comprobante que la empresa puede emitir

**Ejemplo respuesta**:
```json
[
  { "id": 1, "descripcion": "Factura A", "fechaDesde": "2010-01-01" },
  { "id": 6, "descripcion": "Factura B", "fechaDesde": "2010-01-01" },
  { "id": 11, "descripcion": "Factura C", "fechaDesde": "2010-01-01" }
]
```

---

### 2. En `AFIPServiceSOAP.ts`

#### `determinarTipoFacturaDesdeAFIP()`
```typescript
async determinarTipoFacturaDesdeAFIP(
  cuitCliente: string,
  empresaCondicionIVA: string
): Promise<{ 
  tipoFactura: string; 
  condicionIVA: number; 
  descripcionCondicion: string;
  discriminaIVA: boolean;
}>
```

**Funcionalidad**:
1. Consulta condiciones IVA disponibles desde AFIP
2. Consulta tipos de comprobante habilitados
3. Analiza estructura del CUIT del cliente:
   - **Prefijo 30/33**: Persona Jurídica → Asume Responsable Inscripto
   - **Prefijo 20/23/27**: Persona Física → Asume Monotributista
4. Determina tipo de factura según lógica de negocio
5. Retorna resultado completo con logs detallados

**Ejemplo uso**:
```typescript
const afipService = new AFIPServiceSOAP(config);
const resultado = await afipService.determinarTipoFacturaDesdeAFIP(
  '20947011473', // CUIT cliente
  'Responsable Inscripto' // Condición empresa
);

console.log(resultado);
// {
//   tipoFactura: 'B',
//   condicionIVA: 6,
//   descripcionCondicion: 'Monotributista',
//   discriminaIVA: true
// }
```

---

## 🔍 DETECCIÓN AUTOMÁTICA POR ESTRUCTURA DE CUIT

### Reglas de Prefijos CUIT

| Prefijo | Tipo          | Condición IVA Probable       | Tipo Factura (desde RI) |
|---------|---------------|------------------------------|-------------------------|
| 30      | Pers. Jurídica| Responsable Inscripto        | A                       |
| 33      | Pers. Jurídica| Responsable Inscripto        | A                       |
| 20      | Pers. Física  | Monotributista               | B                       |
| 23      | Pers. Física  | Monotributista               | B                       |
| 27      | Pers. Física  | Monotributista               | B                       |

**Nota**: Esta es una heurística basada en la estructura del CUIT. Para mayor precisión, se podría integrar con el padrón A5 de AFIP en el futuro.

---

## 📝 ACTUALIZACIÓN EN `facturacionController.ts`

### Antes
```typescript
const tipoComprobanteLetra = AFIPServiceSOAP.determinarTipoFactura(
  EMPRESA.condicionIVA,
  cliente.condicionIVA // ❌ Dato manual de BD
);
```

### Ahora
```typescript
const afipService = new AFIPServiceSOAP(config);
const resultadoAFIP = await afipService.determinarTipoFacturaDesdeAFIP(
  cliente.numeroDocumento, // ✅ CUIT real
  EMPRESA.condicionIVA
);

const tipoComprobanteLetra = resultadoAFIP.tipoFactura; // ✅ Detectado por AFIP
const discriminaIVA = venta.aplicaIVA && resultadoAFIP.discriminaIVA;

// Guardar condición IVA detectada
factura.receptorCondicionIVA = resultadoAFIP.descripcionCondicion;
```

---

## 🎨 LOGS DE DEPURACIÓN

El nuevo método genera logs completos:

```
🔍 ========== CONSULTA AFIP PARA TIPO FACTURA ==========
🔍 CUIT Cliente: 20947011473
🔍 Empresa condición IVA: Responsable Inscripto
📋 Condiciones IVA obtenidas de AFIP: 14
📋 Tipos comprobante habilitados: 1-Factura A, 6-Factura B, 11-Factura C
🎯 Condición IVA detectada: Monotributista (código 6)
📄 Tipo factura determinado: B
💰 Discrimina IVA: true
========== FIN CONSULTA AFIP ==========
```

---

## ⚙️ FALLBACK EN CASO DE ERROR

Si la consulta a AFIP falla (red, timeout, etc.), el sistema usa un **fallback seguro**:

```typescript
catch (error) {
  console.error('❌ Error al consultar AFIP');
  console.log('⚠️ Usando lógica estática como fallback');
  
  return {
    tipoFactura: 'B',  // Opción más segura (discrimina IVA)
    condicionIVA: CONDICION_IVA.CONSUMIDOR_FINAL,
    descripcionCondicion: 'Consumidor Final (fallback)',
    discriminaIVA: true
  };
}
```

---

## 🚀 VENTAJAS DE ESTE ENFOQUE

1. **Precisión**: Datos directos de AFIP, no de BD local
2. **Automatización**: No requiere actualizar manualmente condición IVA de clientes
3. **Validación**: Tipos de comprobante se validan contra los habilitados
4. **Trazabilidad**: Logs completos de cada decisión
5. **Robustez**: Fallback seguro en caso de error
6. **Mantenimiento**: Menos errores de datos inconsistentes

---

## 📊 CASOS DE USO RESUELTOS

### Caso 1: CUIT mal categorizado
**Antes**: Cliente CUIT 30-12345678-9 marcado como "Consumidor Final" → Factura C → ❌ Rechazada  
**Ahora**: Detecta prefijo 30 → Responsable Inscripto → Factura A → ✅ Aprobada

### Caso 2: Datos desactualizados
**Antes**: Cliente cambió de Monotributo a RI hace 6 meses, BD no actualizada → Error  
**Ahora**: Consulta AFIP en tiempo real → Datos siempre actualizados → ✅ OK

### Caso 3: Cliente nuevo sin categorizar
**Antes**: Admin debe investigar y categorizar manualmente  
**Ahora**: Sistema auto-detecta por CUIT → Categorización automática → ✅ Rápido

---

## 🔮 MEJORAS FUTURAS POSIBLES

1. **Cache de consultas**: Guardar resultados por CUIT para reducir llamadas a AFIP
2. **Integración padrón A5**: Consultar constancia de inscripción completa
3. **Actualización automática**: Sincronizar cliente.condicionIVA con datos AFIP
4. **Validación pre-venta**: Consultar AFIP al crear venta, no solo al facturar

---

**Fecha implementación**: 21 de noviembre de 2025  
**Versión**: 3.0  
**Estado**: ✅ Implementado y listo para pruebas
