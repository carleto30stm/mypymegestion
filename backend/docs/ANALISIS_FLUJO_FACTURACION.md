# 📊 Análisis del Flujo de Facturación - Sistema myGestor
**Fecha:** 20 de noviembre de 2025  
**Revisor:** Experto en Facturación Electrónica AFIP/ARCA  
**Alcance:** Flujo completo desde Venta → Confirmar → Cobrar → Facturar

---

## 🔍 **FLUJO ACTUAL IMPLEMENTADO**

### **Etapa 1: Creación de Venta** (`VentasPage`)
```
Usuario → Selecciona Cliente + Productos → Registra Venta
```

**Estado inicial:** `pendiente`  
**Acciones:**
- ✅ Valida stock disponible (NO descuenta)
- ✅ Calcula IVA según flag `aplicaIVA` (decisión por venta)
- ✅ Guarda `requiereFacturaAFIP` del cliente
- ✅ NO crea movimientos contables (venta pendiente)
- ✅ NO registra cobro (se hace después)

**Backend:** `ventasController.crearVenta`
```typescript
Estado: 'pendiente'
Stock: NO se descuenta (se descuenta al confirmar)
Cuenta Corriente: NO se afecta (se afecta al confirmar)
```

---

### **Etapa 2: Confirmación de Venta** (`HistorialVentasPage`)
```
Usuario → Confirma Venta → Descuenta Stock + Registra Deuda
```

**Estado nuevo:** `confirmada`  
**Acciones:**
- ✅ Descuenta stock de productos
- ✅ Crea `MovimientoCuentaCorriente` (tipo: 'venta', debe: total)
- ✅ Actualiza `Cliente.saldoCuenta` (incrementa deuda)
- ✅ Registra `usuarioConfirmacion` (auditoría)

**Backend:** `ventasController.confirmarVenta`
```typescript
// IMPORTANTE: Al confirmar se genera DEUDA, no COBRO
MovimientoCuentaCorriente.create({
  tipo: 'venta',
  debe: venta.total,  // ← Cliente ahora DEBE este monto
  haber: 0,
  saldo: saldoAnterior + venta.total
})
```

**⚠️ PROBLEMA DETECTADO #1:**
```
La venta confirmada NO diferencia entre:
- Ventas a crédito (CUENTA_CORRIENTE) → Debe generar deuda
- Ventas de contado (EFECTIVO, CHEQUE, etc.) → NO debe generar deuda

Actualmente TODAS las ventas confirmadas generan deuda en cuenta corriente,
incluso si se pagaron al contado.
```

---

### **Etapa 3: Cobro de Venta** (`CobranzasPage`)
```
Usuario → Selecciona Ventas → Registra Formas de Pago → Crea Recibo
```

**Acciones:**
- ✅ Crea `ReciboPago` con formas de pago detalladas
- ✅ Actualiza ventas: `estadoCobranza`, `recibosRelacionados`
- ✅ Crea `Gasto` por cada forma de pago REAL (excluyendo CUENTA_CORRIENTE)
- ✅ Crea `MovimientoCuentaCorriente` (tipo: 'recibo', haber: totalCobradoReal)
- ✅ Actualiza `Cliente.saldoCuenta` (reduce deuda)

**Backend:** `recibosController.crearRecibo`
```typescript
// Formas de pago REALES (impactan caja)
formasPagoReales = formasPago.filter(fp => fp.medioPago !== 'CUENTA_CORRIENTE')

// Se crean Gastos solo para pagos físicos
formasPagoReales.forEach(fp => {
  Gasto.create({
    tipoOperacion: 'entrada',
    rubro: 'COBRO.VENTA',
    entrada: fp.monto,
    banco: fp.banco
  })
})

// Reduce deuda SOLO por pagos físicos
MovimientoCuentaCorriente.create({
  tipo: 'recibo',
  haber: totalCobradoReal,  // ← Reduce deuda
  debe: 0
})
```

**⚠️ PROBLEMA DETECTADO #2:**
```
Sistema NO diferencia momento del cobro:
- Contra entrega (al despachar mercadería)
- Anticipado (antes de confirmar venta)
- Diferido (después de confirmar venta)

Esto causa inconsistencias en el flujo de caja y estados de venta.
```

---

### **Etapa 4: Facturación AFIP** (`FacturasPage`)
```
Usuario → Selecciona Ventas sin Factura → Crea Factura → Autoriza en AFIP
```

**Estados:** `borrador` → `autorizada` / `rechazada` / `error`  
**Acciones:**
- ✅ Agrupa ventas del mismo cliente
- ✅ Genera factura con items consolidados
- ✅ Solicita CAE a AFIP (implementación pendiente)
- ✅ Actualiza ventas: `facturaId`, `estadoFacturacion`

**Backend:** `facturasController.crearFacturaDesdeVentas`
```typescript
// Validaciones AFIP
- Cliente debe tener CUIT/DNI válido
- Email, dirección, ciudad obligatorios si requiereFacturaAFIP
- Código postal obligatorio para CF/Monotributista
- Tipo de comprobante según condición IVA:
  * Responsable Inscripto → Factura A
  * Monotributista/Consumidor Final → Factura B
  * Exento → Factura C
```

---

## 🚨 **PROBLEMAS CRÍTICOS IDENTIFICADOS**

### **1. Deuda generada en ventas de contado**
**Impacto:** ALTO  
**Descripción:**  
Al confirmar CUALQUIER venta se genera deuda en cuenta corriente, incluso si el cliente pagó al contado (efectivo/cheque/tarjeta).

**Escenario problemático:**
```
1. Cliente paga $10.000 en efectivo (venta de contado)
2. Usuario confirma venta → Se genera deuda de $10.000 en CC
3. Usuario crea recibo con efectivo $10.000 → Reduce deuda a $0
4. Resultado: Cliente nunca debió tener deuda, pero quedó registrada
```

**Solución propuesta:**
```typescript
// En ventasController.confirmarVenta
if (venta.medioPago === 'CUENTA_CORRIENTE') {
  // Solo ventas a crédito generan deuda
  await MovimientoCuentaCorriente.create({
    tipo: 'venta',
    debe: venta.total,
    haber: 0
  })
  
  await Cliente.findByIdAndUpdate(venta.clienteId, {
    saldoCuenta: nuevoSaldo
  })
} else {
  // Ventas de contado NO generan deuda
  // El cobro se registra aparte al crear el recibo
}
```

---

### **2. Falta sincronización entre cobro y confirmación**
**Impacto:** MEDIO  
**Descripción:**  
Sistema no maneja correctamente los distintos momentos de cobro según el tipo de venta.

**Flujos actuales vs ideales:**

| Tipo de Venta | Flujo Actual | Flujo Ideal |
|---------------|--------------|-------------|
| **Contra Entrega** | 1. Confirmar<br>2. Cobrar<br>3. Entregar | 1. Preparar<br>2. Entregar + Cobrar<br>3. Confirmar |
| **Anticipado** | 1. Confirmar<br>2. Cobrar | 1. Cobrar<br>2. Confirmar |
| **Diferido (Crédito)** | 1. Confirmar<br>2. Cobrar después | ✅ Correcto |

**Solución propuesta:**
```typescript
// Agregar campo momentoCobro en Venta
momentoCobro: 'anticipado' | 'contra_entrega' | 'diferido'

// Lógica de confirmación
if (venta.momentoCobro === 'anticipado') {
  // Validar que existe recibo ANTES de confirmar
  if (!venta.recibosRelacionados.length) {
    throw new Error('Ventas anticipadas requieren cobro previo')
  }
}

if (venta.momentoCobro === 'contra_entrega') {
  // Validar que cobro y entrega estén completos
  if (venta.estadoCobranza !== 'pagado' || venta.estadoEntrega !== 'entregado') {
    throw new Error('Ventas contra entrega requieren cobro y entrega simultáneos')
  }
}
```

---

### **3. Facturación desconectada del cobro**
**Impacto:** MEDIO  
**Descripción:**  
Se puede facturar ventas sin cobrar, o cobrar sin facturar, sin validaciones cruzadas.

**Problema AFIP:**
```
Según AFIP, la factura debe emitirse:
- Antes o al momento de la entrega (ventas de contado)
- Al vencimiento del crédito (ventas a plazo)

Sistema actual permite:
- Facturar venta pendiente de cobro (correcto para crédito)
- Facturar venta ya cobrada (puede generar discrepancias)
- NO facturar venta ya cobrada (incumplimiento fiscal)
```

**Solución propuesta:**
```typescript
// En facturasController.crearFacturaDesdeVentas
for (const venta of ventas) {
  if (venta.requiereFacturaAFIP) {
    // Validar según momento de cobro
    if (venta.momentoCobro === 'anticipado' || venta.momentoCobro === 'contra_entrega') {
      // Factura debe crearse ANTES o AL MOMENTO de confirmar
      if (venta.estado === 'confirmada' && !venta.facturaId) {
        throw new Error('Venta requiere factura antes de confirmar')
      }
    }
    
    if (venta.medioPago !== 'CUENTA_CORRIENTE') {
      // Ventas de contado deben facturarse al cobrar
      if (venta.estadoCobranza === 'pagado' && !venta.facturaId) {
        // Auto-generar factura al crear recibo
      }
    }
  }
}
```

---

### **4. Inconsistencia en enums de medios de pago**
**Impacto:** BAJO (ya documentado)  
**Descripción:**  
Ya identificado en copilot-instructions.md:
- `MEDIO_PAGO` (Gasto): `'CHEQUE TERCERO'`, `'CHEQUE PROPIO'`
- `MEDIOS_PAGO` (ReciboPago): `'CHEQUE'`

**Solución propuesta:**
```typescript
// Unificar en Types.ts
export const MEDIOS_PAGO_UNIFICADOS = [
  'EFECTIVO',
  'CHEQUE_TERCERO',
  'CHEQUE_PROPIO',
  'TRANSFERENCIA',
  'TARJETA_DEBITO',
  'TARJETA_CREDITO',
  'CUENTA_CORRIENTE'
] as const

// Deprecar enums antiguos y migrar gradualmente
```

---

## 💡 **OPORTUNIDADES DE MEJORA**

### **Mejora 1: Estados de venta más granulares**
**Beneficio:** Mejor trazabilidad del ciclo de vida

```typescript
// Actual
ESTADOS_VENTA = ['pendiente', 'confirmada', 'anulada']

// Propuesto
ESTADOS_VENTA_MEJORADO = [
  'borrador',        // Venta creada, aún editable
  'pendiente',       // Venta registrada, pendiente confirmar
  'confirmada',      // Stock descontado, deuda generada (si aplica)
  'facturada',       // Factura emitida
  'entregada',       // Mercadería despachada
  'cobrada',         // Pago recibido
  'completada',      // Todo el ciclo cerrado
  'anulada'          // Cancelada
]
```

---

### **Mejora 2: Workflow automático según tipo de venta**
**Beneficio:** Reduce errores humanos, asegura cumplimiento fiscal

```typescript
interface ConfiguracionVenta {
  tipo: 'contado' | 'credito' | 'contra_entrega' | 'anticipado'
  requiereFactura: boolean
  requiereRemito: boolean
  
  // Workflow automático
  pasos: {
    orden: number
    accion: 'cobrar' | 'confirmar' | 'facturar' | 'entregar'
    bloqueante: boolean  // ¿Debe completarse antes del siguiente?
  }[]
}

// Ejemplo: Venta de contado con factura
{
  tipo: 'contado',
  requiereFactura: true,
  pasos: [
    { orden: 1, accion: 'cobrar', bloqueante: true },
    { orden: 2, accion: 'facturar', bloqueante: true },
    { orden: 3, accion: 'confirmar', bloqueante: true },
    { orden: 4, accion: 'entregar', bloqueante: false }
  ]
}

// Sistema valida que cada paso se complete en orden
```

---

### **Mejora 3: Facturación automática al cobrar**
**Beneficio:** Cumplimiento automático AFIP, menos pasos manuales

```typescript
// En recibosController.crearRecibo
if (cliente.requiereFacturaAFIP) {
  const ventasSinFacturar = ventas.filter(v => !v.facturaId)
  
  if (ventasSinFacturar.length > 0) {
    // Auto-generar factura borrador
    const facturaBorrador = await crearFacturaBorrador(ventasSinFacturar)
    
    // Intentar autorizar automáticamente
    try {
      await autorizarFacturaAFIP(facturaBorrador._id)
      // Si autoriza OK, asociar a ventas y recibo
    } catch (err) {
      // Si falla, dejar en borrador para revisión manual
      console.warn('Factura quedó en borrador, revisar:', err)
    }
  }
}
```

---

### **Mejora 4: Validaciones cruzadas en frontend**
**Beneficio:** UX mejorada, menos errores

```tsx
// En HistorialVentasPage
const puedeConfirmar = (venta: Venta) => {
  // Ventas anticipadas requieren cobro previo
  if (venta.momentoCobro === 'anticipado') {
    return venta.estadoCobranza === 'pagado'
  }
  
  // Ventas contra entrega requieren cobro y entrega simultáneos
  if (venta.momentoCobro === 'contra_entrega') {
    return venta.estadoCobranza === 'pagado' && venta.estadoEntrega === 'entregado'
  }
  
  // Ventas a crédito pueden confirmarse sin cobro
  return true
}

// Deshabilitar botón "Confirmar" si no cumple condiciones
<Button 
  disabled={!puedeConfirmar(venta)}
  onClick={() => handleConfirmar(venta)}
>
  Confirmar
</Button>
```

---

### **Mejora 5: Dashboard de cumplimiento fiscal**
**Beneficio:** Visibilidad de pendientes AFIP

```tsx
// Nuevo componente: FiscalComplianceDashboard
interface AlertaFiscal {
  tipo: 'ventas_sin_facturar' | 'facturas_sin_autorizar' | 'ventas_sin_cae'
  cantidad: number
  montoTotal: number
  items: Venta[] | Factura[]
}

// Alertas críticas
- Ventas cobradas sin factura (> 24hs)
- Facturas en borrador (> 72hs)
- Ventas de contado sin CAE
- Clientes con requiereFacturaAFIP pero ventas sin facturar
```

---

## 📋 **PLAN DE IMPLEMENTACIÓN SUGERIDO**

### **Fase 1: Correcciones Críticas** (1-2 semanas)
**Prioridad:** ALTA

1. ✅ **Separar lógica de deuda por tipo de venta**
   - Modificar `ventasController.confirmarVenta`
   - Solo generar deuda si `medioPago === 'CUENTA_CORRIENTE'`
   - Agregar tests para verificar comportamiento

2. ✅ **Agregar campo `momentoCobro` en Venta**
   - Migración de datos (default: 'diferido')
   - Actualizar modelo y tipos
   - Agregar selector en `VentasPage`

3. ✅ **Validar facturación según momento de cobro**
   - Implementar validaciones cruzadas
   - Alertas en frontend si faltan pasos

---

### **Fase 2: Mejoras de Workflow** (2-3 semanas)
**Prioridad:** MEDIA

4. ✅ **Estados de venta granulares**
   - Nuevo enum `ESTADOS_VENTA_MEJORADO`
   - Migración de datos existentes
   - Actualizar UI para mostrar estados

5. ✅ **Facturación automática al cobrar**
   - Implementar lógica en `recibosController`
   - Configuración por cliente (auto/manual)
   - Logs de auditoría

6. ✅ **Unificación de enums de medios de pago**
   - Crear `MEDIOS_PAGO_UNIFICADOS`
   - Script de migración
   - Deprecar enums antiguos

---

### **Fase 3: UX y Compliance** (2 semanas)
**Prioridad:** BAJA

7. ✅ **Dashboard de cumplimiento fiscal**
   - Componente `FiscalComplianceDashboard`
   - Alertas en tiempo real
   - Reportes exportables

8. ✅ **Validaciones cruzadas en frontend**
   - Deshabilitar acciones no permitidas
   - Tooltips explicativos
   - Flujos guiados

---

## 🎯 **CONCLUSIÓN**

### **Fortalezas del sistema actual:**
- ✅ Separación clara de responsabilidades (Venta → Cobro → Factura)
- ✅ Auditoría completa (usuarios, fechas, motivos)
- ✅ Cuenta corriente con doble contabilidad
- ✅ Componentes reutilizables (FormaPagoModal)
- ✅ Validaciones AFIP implementadas

### **Debilidades críticas:**
- ❌ Genera deuda en ventas de contado
- ❌ No diferencia momentos de cobro
- ❌ Facturación desconectada del cobro
- ❌ Falta workflow automático

### **Recomendación final:**
**Implementar Fase 1 (correcciones críticas) ANTES de ir a producción.**  
Las fases 2 y 3 pueden implementarse gradualmente sin afectar operación.

**Riesgo actual:** Sistema puede generar inconsistencias contables y fiscales en producción si no se corrige la lógica de deuda en ventas de contado.

---

**Aprobado para revisión por:** Equipo de Desarrollo  
**Próximo paso:** Validar propuestas con stakeholders y priorizar implementación
