# 📊 Sistema de Métricas de Productos - Documentación Técnica

## 🎯 Resumen Ejecutivo

Sistema profesional de análisis de productos vendidos con cálculo de márgenes, rentabilidad y clasificación ABC. Permite tomar decisiones estratégicas basadas en datos reales de ventas.

---

## 🏗️ Arquitectura Implementada

### **Backend**

#### 1. Controlador: `ventasController.getEstadisticasProductos`
**Ubicación:** `backend/src/controllers/ventasController.ts`

**Pipeline MongoDB** (10 pasos de agregación):

```typescript
// Paso 1: Filtrar ventas confirmadas (estado='confirmada')
// Paso 2: $unwind items (desenrollar productos)
// Paso 3: $lookup con colección 'productos' (datos actuales)
// Paso 4: $unwind producto (mantener nulls si producto eliminado)
// Paso 5: Filtrar por categoría (opcional)
// Paso 6: $group por productoId - calcular métricas
// Paso 7: $project - calcular campos derivados
// Paso 8: $addFields - utilidades y porcentajes
// Paso 9: $sort por totalVendido descendente
// Paso 10: $limit (opcional)
```

**Métricas Calculadas:**

| Métrica | Fórmula | Descripción |
|---------|---------|-------------|
| `unidadesVendidas` | `SUM(items.cantidad)` | Total unidades vendidas |
| `numeroVentas` | `COUNT(*)` | Cantidad de transacciones |
| `totalVendido` | `SUM(items.total)` | Monto total con IVA |
| `totalNetoSinIVA` | `totalVendido / 1.21` | Aproximación monto sin IVA |
| `costoTotalEstimado` | `unidadesVendidas * precioCompraActual` | Costo de inventario |
| `margenBrutoUnitario` | `precioVentaActual - precioCompraActual` | Margen por unidad |
| `porcentajeMargenBruto` | `(margenBrutoUnitario / precioVentaActual) * 100` | % margen sobre precio venta |
| `utilidadNetaEstimada` | `totalNetoSinIVA - costoTotalEstimado` | Ganancia neta estimada |
| `porcentajeUtilidadNeta` | `(utilidadNetaEstimada / totalNetoSinIVA) * 100` | % ganancia sobre venta |
| `ticketPromedio` | `totalVendido / numeroVentas` | Monto promedio por venta |
| `participacionVentas` | `(totalVendido / totalGeneral) * 100` | % del total de ventas |
| `clasificacionABC` | Ranking | A=Top 20%, B=20-50%, C=50-100% |

**Parámetros Query:**
- `fechaInicio` (opcional): YYYY-MM-DD
- `fechaFin` (opcional): YYYY-MM-DD
- `categoria` (opcional): string
- `limit` (opcional): number (Top N productos)

**Respuesta:**
```json
{
  "productos": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "codigoProducto": "NOTE-001",
      "nombreProducto": "Notebook Dell",
      "categoria": "Tecnología",
      "unidadesVendidas": 15,
      "numeroVentas": 12,
      "totalVendido": 2700000,
      "totalNetoSinIVA": 2231404.96,
      "totalDescuentos": 50000,
      "precioPromedioVenta": 180000,
      "precioVentaActual": 180000,
      "precioCompraActual": 120000,
      "stockActual": 5,
      "margenBrutoUnitario": 60000,
      "porcentajeMargenBruto": 33.33,
      "utilidadNetaEstimada": 431404.96,
      "porcentajeUtilidadNeta": 19.34,
      "ticketPromedio": 225000,
      "ranking": 1,
      "participacionVentas": 35.5,
      "clasificacionABC": "A"
    }
  ],
  "totales": {
    "totalUnidadesVendidas": 150,
    "totalMontoVendido": 7600000,
    "totalUtilidadEstimada": 1200000,
    "totalDescuentos": 80000,
    "totalProductos": 25,
    "margenPromedioGeneral": 15.79
  },
  "filtros": {
    "fechaInicio": "2024-10-01",
    "fechaFin": "2024-10-31",
    "categoria": "Todas",
    "limit": "50"
  }
}
```

#### 2. Ruta Backend
**Ubicación:** `backend/src/routes/ventas.ts`

```typescript
router.get('/estadisticas-productos', protect, getEstadisticasProductos);
```

**Endpoint completo:** `GET /api/ventas/estadisticas-productos`

---

### **Frontend**

#### 1. Types TypeScript
**Ubicación:** `frontend/types.ts`

Interfaces creadas:
- `MetricaProducto`: estructura de producto individual con todas las métricas
- `TotalesEstadisticasProductos`: totales generales
- `FiltrosEstadisticasProductos`: parámetros de consulta
- `EstadisticasProductos`: respuesta completa del endpoint

#### 2. Redux Slice
**Ubicación:** `frontend/redux/slices/metricasProductosSlice.ts`

**State:**
```typescript
interface MetricasProductosState {
  estadisticas: EstadisticasProductos | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}
```

**Actions:**
- `fetchEstadisticasProductos` (async thunk): consulta al backend
- `limpiarEstadisticas`: reset del estado

**Integración en store:**
```typescript
// frontend/redux/store.ts
metricasProductos: metricasProductosReducer
```

#### 3. Componente Principal
**Ubicación:** `frontend/components/MetricasProductos.tsx`

**Features Implementadas:**

✅ **Filtros Avanzados:**
- Rango de fechas (fecha inicio/fin)
- Categoría de productos
- Top N productos (10/20/50/100/Todos)
- Búsqueda en tiempo real

✅ **Cards de Resumen (4 KPIs):**
1. Total Productos
2. Unidades Vendidas
3. Total Vendido
4. Utilidad Estimada (con % margen promedio)

✅ **Tabla Interactiva:**
- Ordenamiento por cualquier columna (click en header)
- Colores semáforo para márgenes:
  - Verde: ≥ 40%
  - Amarillo: 25-39%
  - Rojo: < 25%
- Chips de clasificación ABC con colores
- Iconos de alerta para:
  - Márgenes bajos (< 25%)
  - Stock bajo (≤ 10 unidades)
- Medallas para Top 3 productos (oro/plata/bronce)
- Hover tooltips con información adicional

✅ **Exportación Excel:**
- Botón "Exportar Excel" en header
- 18 columnas de datos
- Ancho de columnas auto-ajustado
- Nombre de archivo: `metricas_productos_{fechaInicio}_{fechaFin}.xlsx`

**Columnas de la Tabla:**
1. Ranking (#)
2. Clasificación ABC
3. Producto (código + nombre)
4. Categoría
5. Unidades Vendidas (+ nº ventas)
6. Total Vendido (+ total neto)
7. Participación (%)
8. Margen Bruto (% + alerta)
9. Utilidad Neta ($ + %)
10. Stock Actual (+ alerta)

#### 4. Página Dedicada
**Ubicación:** `frontend/pages/MetricasProductosPage.tsx`

Wrapper simple con layout estándar (fondo gris, padding 3).

#### 5. Integración en Navegación

**App.tsx:**
```typescript
import MetricasProductosPage from './pages/MetricasProductosPage';
// ...
<Route path="/metricas-productos" element={<MetricasProductosPage />} />
```

**Sidebar.tsx:**
```typescript
import ShowChartIcon from '@mui/icons-material/ShowChart';
// ...
<ListItemButton onClick={() => navigate('/metricas-productos')}>
  <ListItemIcon><ShowChartIcon /></ListItemIcon>
  <ListItemText primary="Métricas Productos" />
</ListItemButton>
```

**URL de acceso:** `/metricas-productos`

---

## 📈 Interpretación Contable

### **Clasificación ABC (Análisis de Pareto)**

| Clase | Definición | Estrategia Recomendada |
|-------|------------|------------------------|
| **A** | Top 20% productos | Alta rotación, prioridad stock, promoción intensiva |
| **B** | 20-50% productos | Rotación media, stock moderado, promoción selectiva |
| **C** | 50-100% productos | Baja rotación, stock mínimo, evaluar descontinuar |

**Ley 80/20:** Típicamente, el 20% de los productos genera el 80% de las ventas.

### **Márgenes de Rentabilidad**

1. **Margen Bruto** = `(Precio Venta - Costo) / Precio Venta * 100`
   - **Ideal:** > 40% (productos premium)
   - **Aceptable:** 25-40% (commodities)
   - **Riesgo:** < 25% (revisar pricing o descontinuar)

2. **Utilidad Neta Estimada** = `Ventas Netas (sin IVA) - Costos`
   - NO incluye gastos operacionales (alquiler, sueldos, servicios)
   - Es una **proyección optimista** del margen bruto realizado
   - Para utilidad real: restar gastos fijos y variables

### **Semáforos de Alerta**

🟢 **Verde (OK):** Margen ≥ 40% + Stock suficiente  
🟡 **Amarillo (Precaución):** Margen 25-39% o Stock bajo  
🔴 **Rojo (Crítico):** Margen < 25% + Stock muy bajo  

**Acciones Correctivas:**
- 🔴 Margen bajo + Alta rotación → Subir precio gradualmente
- 🔴 Margen bajo + Baja rotación → Descontinuar o liquidar
- 🟡 Stock bajo + Alta rotación → Aumentar reposición
- 🟢 Margen alto + Baja rotación → Evaluar reducción de precio

---

## 🚀 Ejemplos de Uso

### Caso 1: Top 10 Productos del Mes Actual
```
Filtros:
- Fecha Inicio: 2024-11-01
- Fecha Fin: 2024-11-30
- Categoría: Todas
- Limit: Top 10
```

**Resultado:** Lista de los 10 productos más vendidos en noviembre, ordenados por facturación.

### Caso 2: Análisis de Categoría "Tecnología"
```
Filtros:
- Fecha Inicio: 2024-01-01
- Fecha Fin: 2024-11-30
- Categoría: Tecnología
- Limit: Todos
```

**Resultado:** Todos los productos de tecnología con sus métricas anuales.

### Caso 3: Identificar Productos con Margen Bajo
1. Cargar datos con filtros deseados
2. Click en columna "Margen Bruto" para ordenar ascendente
3. Productos con 🔴 son candidatos a:
   - Aumentar precio
   - Renegociar costo con proveedor
   - Descontinuar

### Caso 4: Exportar para Análisis Externo
1. Configurar filtros
2. Click en "Exportar Excel"
3. Abrir en Excel/Google Sheets
4. Aplicar tablas dinámicas, gráficos personalizados

---

## 🔧 Mantenimiento y Mejoras Futuras

### **Optimizaciones Backend:**
1. ✅ Índice compuesto en `Venta.items.productoId` + `Venta.estado`
2. ✅ Caché de resultados para períodos cerrados (Redis)
3. ✅ Paginación para listados > 1000 productos
4. ⏳ Materializar vista pre-agregada diaria

### **Mejoras Frontend:**
1. ⏳ Gráfico de barras Top 10 (recharts/chart.js)
2. ⏳ Gráfico de pastel ABC (% participación)
3. ⏳ Tabla de evolución temporal (ventas mes a mes)
4. ⏳ Comparación año actual vs año anterior
5. ⏳ Predicción de stock basada en rotación
6. ⏳ Alertas automáticas de productos críticos

### **Features Avanzadas:**
1. ⏳ Calcular IVA real (no aproximación)
2. ⏳ Integrar gastos operacionales (utilidad real)
3. ⏳ Análisis de estacionalidad (ventas por mes)
4. ⏳ Matriz BCG (Crecimiento vs Participación)
5. ⏳ Recomendaciones automáticas con IA

---

## 📋 Checklist de Validación

✅ **Backend:**
- [x] Endpoint creado y documentado
- [x] Ruta registrada con autenticación
- [x] Pipeline de agregación optimizado
- [x] Manejo de errores y logs
- [x] Respuesta con estructura consistente

✅ **Frontend:**
- [x] Types TypeScript definidos
- [x] Redux slice implementado
- [x] Componente con filtros funcionales
- [x] Tabla con ordenamiento
- [x] Exportación Excel
- [x] Navegación integrada (sidebar + ruta)
- [x] Diseño responsive
- [x] Sin errores de compilación

✅ **UX/UI:**
- [x] Cards de resumen visibles
- [x] Colores semáforo intuitivos
- [x] Alertas visuales (iconos)
- [x] Tooltips informativos
- [x] Loading states
- [x] Error handling

---

## 🎓 Conceptos Contables Clave

### **Diferencia: Margen Bruto vs Margen Neto**

**Margen Bruto:**
```
Margen Bruto = (Precio Venta - Costo Producto) / Precio Venta * 100
```
Mide la rentabilidad **por producto**, sin considerar gastos operacionales.

**Margen Neto (Real):**
```
Margen Neto = (Ingresos - Costos - Gastos Operacionales) / Ingresos * 100
```
Incluye:
- Gastos fijos (alquiler, sueldos, servicios)
- Gastos variables (comisiones, envíos, marketing)
- Impuestos (IIBB, etc.)

**Ejemplo Práctico:**

```
Producto: Notebook Dell
- Precio Venta: $180.000
- Costo Compra: $120.000
- Margen Bruto: 33.33%

Si vendimos 15 unidades:
- Ventas Totales: $2.700.000
- Costos Productos: $1.800.000
- Utilidad Bruta: $900.000 (33.33%)

Gastos Operacionales del mes:
- Alquiler: $150.000
- Sueldos: $400.000
- Servicios: $50.000
- Marketing: $100.000
Total Gastos: $700.000

Utilidad Neta Real:
$900.000 - $700.000 = $200.000 (7.4% sobre ventas)
```

**Conclusión:** El margen bruto de 33% se reduce a 7.4% neto después de gastos. Por eso es crítico:
1. Mantener márgenes brutos altos (> 40% ideal)
2. Controlar gastos operacionales
3. Aumentar volumen de ventas (economía de escala)

---

## 🎯 KPIs de Seguimiento

**Métricas Diarias:**
- Productos vendidos (unidades)
- Ticket promedio
- Productos con stock bajo

**Métricas Semanales:**
- Top 10 más vendidos
- Productos con margen < 25%
- Rotación de inventario

**Métricas Mensuales:**
- Análisis ABC completo
- Margen promedio general
- Utilidad neta estimada
- Participación por categoría

**Métricas Trimestrales:**
- Evolución de márgenes
- Productos a descontinuar
- Nuevas oportunidades

---

**Implementado por:** Sistema myGestor  
**Versión:** 1.0  
**Fecha:** Noviembre 2024  
**Estado:** ✅ Producción
