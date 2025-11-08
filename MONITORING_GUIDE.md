# Guía de Monitoreo de Performance - myGestor

**Fecha**: 6 de noviembre de 2025  
**Objetivo**: Saber CUÁNDO implementar Phase 2 (agregación)

---

## 🎯 Umbrales de Alerta

### ⚠️ Warning (considerar Phase 2 pronto)
- Total registros gastos: > 15,000
- Tiempo carga Dashboard: > 2 segundos
- Tiempo cálculo BankSummary: > 1 segundo
- Memoria navegador: > 100MB

### 🚨 Critical (implementar Phase 2 YA)
- Total registros gastos: > 30,000
- Tiempo carga Dashboard: > 5 segundos
- Quejas de usuarios sobre lentitud
- Crashes del navegador

---

## 📈 Cómo Monitorear (Simple)

### 1. Chequeo Manual Mensual

```bash
# Contar registros en MongoDB
cd backend
node -e "const mongoose = require('mongoose'); require('dotenv').config(); mongoose.connect(process.env.MONGODB_URI).then(async () => { const Gasto = mongoose.model('Gasto', new mongoose.Schema({}, { strict: false })); const count = await Gasto.countDocuments(); console.log('Total gastos:', count); process.exit(0); });"
```

### 2. En Chrome DevTools

Cuando uses el Dashboard:
1. Abrir DevTools (F12)
2. Tab **Network**
3. Filtrar por `/api/gastos`
4. Ver columna **Time**

**Aceptable**: < 500ms  
**Warning**: 500ms - 2s  
**Critical**: > 2s

### 3. En Consola del Navegador

Agregar este snippet temporal en `BankSummary.tsx`:

```typescript
// En la función que calcula bankBalances
console.time('BankSummary calculation');
// ... cálculos ...
console.timeEnd('BankSummary calculation');
```

**Aceptable**: < 100ms  
**Warning**: 100ms - 500ms  
**Critical**: > 500ms

---

## 📅 Proyección de Crecimiento

Asumiendo uso intensivo (promedio de PyME):

| Tiempo | Registros Estimados | Status Phase 1 | Acción Requerida |
|--------|---------------------|----------------|------------------|
| Hoy | 5 | ✅ Perfecto | Ninguna |
| 6 meses | ~500 | ✅ Perfecto | Ninguna |
| 1 año | ~2,000 | ✅ Perfecto | Ninguna |
| 2 años | ~5,000 | ✅ Bien | Ninguna |
| 3 años | ~10,000 | ⚠️ Monitorear | Revisar logs |
| 5 años | ~20,000 | ⚠️ Warning | Considerar Phase 2 |
| 7+ años | 30,000+ | 🚨 Critical | Implementar Phase 2 |

**Nota**: Si tu negocio crece rápido (multinacional), ajustar timeline.

---

## 🔔 Alertas Automáticas (Opcional - Avanzado)

Si quieres automatizar, agregar en backend:

```typescript
// backend/src/middleware/performanceLogger.ts
export const performanceLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (req.path === '/api/gastos' && duration > 2000) {
      console.warn(`⚠️ SLOW QUERY: /api/gastos took ${duration}ms`);
      // Opcional: enviar email/notificación
    }
  });
  
  next();
};
```

---

## ✅ Checklist Trimestral

Cada 3 meses, revisar:

- [ ] Contar registros totales en MongoDB
- [ ] Medir tiempo de carga del Dashboard (Network tab)
- [ ] Medir tiempo de cálculo BankSummary (Console)
- [ ] Preguntar a usuarios si notan lentitud
- [ ] Revisar logs de errores/timeouts

**Si TODO está OK** → Continuar con Phase 1 ✅  
**Si alguno en Warning** → Planear Phase 2 para próximo sprint 📋  
**Si alguno en Critical** → Implementar Phase 2 ASAP 🚨

---

## 🚀 Cuándo Implementar Phase 2

**Implementar SI**:
- Registros > 15,000 Y tiempo carga > 2s
- Usuarios reportan lentitud frecuentemente
- Navegador crashea o consume >150MB RAM
- Dashboard tarda más que antes (regresión)

**NO implementar SI**:
- Todo funciona rápido
- Usuarios satisfechos
- Tienes otras prioridades de negocio
- No hay quejas de performance

---

## 💡 Alternativas Antes de Phase 2

Si llegas al umbral pero Phase 2 es mucho trabajo, considera:

1. **Aumentar límite de 3 meses a 1 mes** en default
2. **Paginación en ExpenseTable** (cargar 50 registros a la vez)
3. **Lazy loading** de componentes pesados
4. **Cache en Redis** de consultas frecuentes

Estas son **más rápidas de implementar** que Phase 2.

---

## 📞 Contacto

Si llegas a los umbrales y necesitas ayuda para implementar Phase 2, tengo la documentación lista en `PERFORMANCE_OPTIMIZATION_PHASE1.md` sección "Next Steps - Phase 2".

---

**TL;DR**: 
- ✅ Phase 1 es suficiente por años
- 📊 Monitorea trimestralmente
- 🚨 Implementa Phase 2 solo si Performance < 2s o Registros > 15k
- 💼 Enfócate en features de negocio ahora
