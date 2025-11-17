# Solución: Ventas Pendientes vs Cuenta Corriente Saldada

## 🔍 Problema Identificado

Tenías **3 ventas con `estadoCobranza: 'sin_cobrar'`** PERO la cuenta corriente del cliente mostraba **saldo = 0** (deuda saldada).

### Causa Raíz

Cuando registrabas un pago desde **Cuenta Corriente** → botón "Registrar Pago Real", el sistema:

✅ Creaba `MovimientoCuentaCorriente` (reducía deuda)  
✅ Creaba `Gasto` (registraba ingreso a caja)  
❌ **NO actualizaba las ventas** porque pasaba `ventasIds: []` (array vacío)

**Resultado:** Deuda en 0 PERO ventas siguen apareciendo como pendientes.

---

## ✅ Solución Implementada

### 1. **Mejora en `CuentaCorrienteDetalle.tsx`**

Ahora cuando registras un pago desde cuenta corriente:

```typescript
// ANTES (incorrecto):
ventasIds: []  // ❌ No vinculaba ventas

// AHORA (correcto):
const ventasPendientesCliente = ventas.filter(v => 
  v.clienteId === cliente._id && 
  v.estado === 'confirmada' && 
  v.saldoPendiente > 0
).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

ventasIds: ventasPendientesCliente.map(v => v._id!)  // ✅ Vincula ventas automáticamente
```

### 2. **Cambios Aplicados**

#### **Archivo:** `frontend/components/CuentaCorrienteDetalle.tsx`

**Línea 1-48:** Agregado import de `fetchVentas`
```typescript
import { fetchVentas } from '../redux/slices/ventasSlice';
```

**Línea 55:** Agregado state de ventas
```typescript
const { items: ventas } = useSelector((state: RootState) => state.ventas);
```

**Línea 72:** Cargar ventas al iniciar
```typescript
dispatch(fetchVentas()); // Cargar ventas para identificar pendientes
```

**Línea 103-120:** Lógica mejorada de `handleRegistrarPago`
- ✅ Identifica automáticamente ventas pendientes del cliente
- ✅ Ordena por fecha (más antiguas primero)
- ✅ Pasa `ventasIds` al crear recibo
- ✅ Muestra cantidad de ventas cobradas en el mensaje

**Línea 277-284:** Alert mejorado
- ℹ️ Informa que el pago se aplicará automáticamente a ventas pendientes

**Línea 574-626:** Preview de ventas (nuevo)
- 📋 Muestra tabla con ventas que se cobrarán antes de confirmar

---

## 🎯 Beneficios de la Solución

### ✅ Corrección Automática
- El sistema ahora **vincula automáticamente** el pago con las ventas pendientes
- Prioriza ventas más antiguas (FIFO)

### ✅ Transparencia
- Muestra qué ventas se cobrarán antes de confirmar
- Indica cantidad de ventas en el mensaje de éxito

### ✅ Consistencia
- `MovimientoCuentaCorriente` (deuda) ↔️ `Venta.estadoCobranza` siempre sincronizados
- No más ventas "fantasma" pendientes

---

## 🧹 Limpieza de Datos de Prueba

Creé un script para limpiar toda la base de datos de prueba:

### **Archivo:** `backend/scripts/limpiar-datos-prueba.js`

### Uso:
```bash
cd backend
node scripts/limpiar-datos-prueba.js
```

### Qué hace:
- ❌ Elimina TODAS las ventas
- ❌ Elimina TODOS los recibos
- ❌ Elimina TODOS los movimientos de cuenta corriente
- ❌ Elimina TODOS los gastos
- ❌ Elimina TODOS los remitos (si existe el modelo)
- 🔄 Resetea saldo de TODOS los clientes a 0

⚠️ **ADVERTENCIA:** Solo usar con datos de prueba. NO reversible.

---

## 📝 Flujo Correcto Ahora

### Caso: Cliente debe $10,000 (3 ventas pendientes)

**1. Usuario:** Navega a Cobranzas → Tab "Cuenta Corriente"  
**2. Sistema:** Muestra resumen con deuda de $10,000  
**3. Usuario:** Click en "Registrar Pago Real"  
**4. Sistema:** 
   - 📋 Muestra preview con las 3 ventas pendientes
   - 💰 Abre modal de forma de pago
**5. Usuario:** Completa datos (ej: Efectivo $10,000)  
**6. Sistema al confirmar:**
   - ✅ Crea `ReciboPago` vinculado a las 3 ventas (`ventasIds: [v1, v2, v3]`)
   - ✅ Crea `MovimientoCuentaCorriente` con haber=$10,000 (reduce deuda a 0)
   - ✅ Actualiza las 3 `Ventas` a `estadoCobranza: 'cobrado'`
   - ✅ Crea `Gasto` de entrada $10,000 en caja
   - ✅ Actualiza `Cliente.saldoCuenta` a 0

**Resultado:** Deuda en 0 ✅ + Ventas cobradas ✅ + Ingreso en caja ✅

---

## 🔧 Mantenimiento Futuro

### Si aparecen inconsistencias:

**Verificar:** Ventas pendientes vs saldo de cuenta corriente
```javascript
// En MongoDB Compass o mongosh:
db.ventas.find({ 
  clienteId: ObjectId("..."), 
  estadoCobranza: { $ne: 'cobrado' }, 
  saldoPendiente: { $gt: 0 } 
})

db.clientes.findOne({ _id: ObjectId("...") }, { saldoCuenta: 1 })
```

**Si no coinciden:**
- Revisar si hay recibos con `ventasRelacionadas: []` (array vacío)
- Esos recibos se crearon con la lógica antigua

---

## 📖 Documentación Relacionada

Ver instrucciones del proyecto en `.github/copilot-instructions.md`:

- Sección **11) Sistema de Cuenta Corriente** (líneas 212-318)
- Sección **12) Reporte Contable** (líneas 320-396)
- Sección **13) UI para Regularizar Deuda** (líneas 398-467)

---

## 🎉 Resumen Ejecutivo

**Problema:** Ventas pendientes fantasma después de regularizar deuda  
**Causa:** `ventasIds: []` en ReciboPago no actualizaba ventas  
**Solución:** Auto-detectar y vincular ventas pendientes al crear recibo  
**Resultado:** Sincronización perfecta entre cuenta corriente y estado de ventas  
**Limpieza:** Script disponible para resetear datos de prueba  

✅ **El problema está resuelto y no volverá a ocurrir.**
