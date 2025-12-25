# 📊 Categorías del Reporte Contable - myGestor

## 🔵 SECCIÓN A: INGRESOS

### A.1 Ventas Netas
**Fuentes:**
1. **Ventas (Módulo Ventas)**: De la tabla `Venta` con `estado='confirmada'`
2. **Ventas (Registros Manuales)**: Gastos legacy con:
   - `tipoOperacion='entrada'`
   - `rubro='COBRO.VENTA'`
   - `subRubro='COBRO'` o `'ADEUDADO'`
3. **Devoluciones** (NEGATIVO): Gastos con:
   - `tipoOperacion='entrada'`
   - `subRubro='DEVOLUCION'`

**Fórmula:** `Ventas Netas = Ventas Tabla + Ventas Legacy - Devoluciones`

---

### A.2 Ingresos Operacionales
**Fuentes:**

#### De rubro COBRO.VENTA:
- **Ingresos por Flete**: `subRubro='FLETE'`
- **Comisiones Cobradas**: `subRubro='COMISION'`
- **Ajustes Positivos**: `subRubro='AJUSTE'`

#### De rubro BANCO:
- **Ajustes Bancarios**: 
  - `subRubro='AJUSTE DE BANCO'`
  - `subRubro='AJUSTE CAJA'`
  - `subRubro='AJUSTE'`

**Total:** `A. Total Ingresos = Ventas Netas + Ingresos Operacionales`

---

## 🔴 SECCIÓN B: COSTO DE VENTAS

### B.1 Gastos Variables
**Rubro → Categorías:**

#### PROOV.MATERIA.PRIMA:
- **Materia Prima - Alambre**:
  - `subRubro='ALAMBRE INDUSTRIA'`
  - `subRubro='ALAMBRE RAUP'`
- **Materiales de Embalaje**: `subRubro='EMBALAJE'`
- **Materia Prima - Poliestireno**: `subRubro='POLIESTIRENO'`
- **Servicios de Fundición**: `subRubro='FUNDICION'`
- **Materia Prima - [Otros]**: Otros subRubros

#### PROOVMANO.DE.OBRA:
- **Mano de Obra - [SubRubro]**: Todos los subRubros

**Total:** `B. Costo de Ventas = Total Gastos Variables`

---

## 🟡 SECCIÓN C: GASTOS OPERACIONALES

### C.1 Gastos Fijos (Servicios)
**Rubro: SERVICIOS**

**Categorías:**
- **Energía Eléctrica**: `subRubro='ELECTRICIDAD'`
- **Servicios de Agua**: `subRubro='AGUA'`
- **Gas Natural**: `subRubro='GAS'`
- **Servicios de Internet/Telecomunicaciones**: 
  - `subRubro='RED NET'`
  - `subRubro='Servicios de Internet/Telecomunicaciones'`
- **Servicios de Programación/IT**: `subRubro='PROGRAMACION'`
- **Mantenimiento de Jardín**: `subRubro='JARDIN'`
- **Servicios de Limpieza**: `subRubro='LIMPIEZA'`
- **Servicios - [Otros]**: Otros subRubros

---

### C.2 Gastos de Personal
**Rubro: SUELDOS**

**Categorías por Concepto:**
- **Sueldos - [SubRubro]**: `concepto='sueldo'`
- **Adelantos - [SubRubro]**: `concepto='adelanto'`
- **Horas Extra - [SubRubro]**: `concepto='hora_extra'`
- **Aguinaldos - [SubRubro]**: `concepto='aguinaldo'`
- **incentivos - [SubRubro]**: `concepto='incentivos'`
- **Personal - [SubRubro]**: Otros conceptos

---

### C.3 Gastos Administrativos
**Rubro: GASTOS ADMINISTRATIVOS / GASTOS.ADMIN**

**Categorías:**
- **Honorarios Profesionales**: `subRubro='HONORARIOS'`
- **Impuestos Bancarios**: `subRubro='IMPUESTO BANCARIOS'`
- **Impuestos de Tarjetas**: `subRubro='IMPUESTO TARJETAS'`
- **Monotributo**: `subRubro='MONOTRIBUTO'`
- **Ingresos Brutos**: `subRubro='II.BB/SIRCREB'`
- **Servicios de Consultoría**: `subRubro='CONSULTORIAS'`
- **Administrativo - [Otros]**: Otros subRubros

---

### C.4 Gastos Operacionales

#### MANT.MAQ (Mantenimiento de Maquinaria):
- **Mantenimiento Mecánico**: `subRubro='MECANICO'`
- **Materiales de Mantenimiento**: `subRubro='MATERIALES'`
- **Maquinaria Nueva**: `subRubro='MAQ. NUEVA'`
- **Mantenimiento - [Otros]**: Otros subRubros

#### MOVILIDAD (Transporte):
- **Combustible**: `subRubro='COMBUSTIBLE'`
- **Peajes**: `subRubro='PEAJES'`
- **Estacionamiento**: `subRubro='ESTACIONAMIENTO'`
- **Mantenimiento Vehículos**:
  - `subRubro='MECANICO'`
  - `subRubro='SERVICE'`
- **Movilidad - [Otros]**: Otros subRubros

#### Otros rubros no clasificados:
- Por defecto van a **Gastos Operacionales**

**Total:** `C. Total Gastos Operacionales = Fijos + Personal + Administrativos + Operacionales`

---

## 🟣 SECCIÓN D: GASTOS FINANCIEROS

### D.1 Gastos Financieros
**Rubros:**

#### BANCO:
**Categorías detalladas:**

##### 💰 Préstamos:
- **Amortización de Préstamos** (Capital pagado - NO es gasto contable):
  - `subRubro='PRESTAMO'`
  - `subRubro='PRESTAMO CAPITAL'`
  - ⚠️ **Nota Contable**: El pago de capital NO es gasto, solo reduce el pasivo. Se muestra en flujo de caja pero NO afecta el Estado de Resultados.

- **Intereses de Préstamos** (Gasto financiero real):
  - `subRubro='PRESTAMO INTERES'`
  - `subRubro='INTERES'`
  - `subRubro='INTERESES'`
  - ✅ **Este SÍ es un gasto financiero** que afecta el margen neto.

##### 🏦 Otros Gastos Bancarios:
- **Comisiones Bancarias**:
  - `subRubro='COMISION BANCARIA'`
  - `subRubro='COMISIONES'`

- **Mantenimiento de Cuenta**:
  - `subRubro='MANTENIMIENTO'`
  - `subRubro='MANTENIMIENTO CUENTA'`

- **Gastos Bancarios** (genérico): Otros subRubros de BANCO

#### ARCA:
- **Impuestos - IVA**: Todos los egresos con `rubro='ARCA'`

**Total:** `D. Total Gastos Financieros`

---

### 📌 Convención de Registro de Préstamos

#### Método Actual (Sistema Simple):

**Opción A - Solo Capital:**
```
Pago cuota préstamo de $10,000 (todo capital, o cuota sin desglose)

Registro Único:
- Tipo: Gasto (salida)
- Rubro: BANCO
- SubRubro: PRESTAMO
- Monto: $10,000
- Concepto: Cuota préstamo 3/12

Resultado en Reporte:
- ✅ "Amortización de Préstamos": $10,000 (solo flujo de caja, NO gasto)
- ✅ Total Gastos Financieros: $0 (correcto si no hay interés)
```

**Opción B - Separar Capital e Intereses (Recomendado si conoces el desglose):**
```
Pago cuota préstamo de $10,500 (capital $10,000 + interés $500)

Registro 1 - Capital:
- Tipo: Gasto (salida)
- Rubro: BANCO
- SubRubro: PRESTAMO
- Monto: $10,000
- Concepto: Capital cuota 3/12

Registro 2 - Interés:
- Tipo: Gasto (salida)
- Rubro: BANCO
- SubRubro: INTERES
- Monto: $500
- Concepto: Interés cuota 3/12

Resultado en Reporte:
- ✅ "Amortización de Préstamos": $10,000 (solo flujo de caja, NO gasto)
- ✅ "Intereses de Préstamos": $500 (gasto financiero, afecta margen neto)
- ✅ Total Gastos Financieros: $500 (correcto contablemente)
```

#### ⚠️ Convención Clave:
- **`subRubro='PRESTAMO'`** → Se asume que es CAPITAL (no se suma a gastos financieros)
- **`subRubro='INTERES'`** → Gasto financiero real (SÍ se suma)
- Si tu cuota incluye ambos, es mejor crear 2 registros separados

**Beneficio:** Sistema contablemente correcto sin necesidad de modificar UI. Si solo tienes el total de la cuota, regístrala como PRESTAMO (capital) y el reporte será correcto en flujo de caja aunque no capture el gasto por interés.

---

## 📈 INDICADORES FINANCIEROS

### Márgenes Calculados:
1. **Margen Bruto** = `Ventas Netas - Costo de Ventas`
   - `% Margen Bruto = (Margen Bruto / Ventas Netas) × 100`

2. **Margen Operacional** = `Margen Bruto - Gastos Operacionales`
   - `% Margen Operacional = (Margen Operacional / Ventas Netas) × 100`

3. **Margen Neto** = `Margen Operacional - Gastos Financieros`
   - `% Margen Neto = (Margen Neto / Ventas Netas) × 100`

4. **Punto de Equilibrio** = `Total Gastos Fijos / (1 - (Gastos Variables / Ventas Netas))`
   - Ventas necesarias para cubrir todos los costos

---

## 🔄 LÓGICA DE CLASIFICACIÓN

### Función `classifyExpense(gasto)`:
```typescript
SUELDOS → 'personal'
SERVICIOS → 'fijo'
GASTOS ADMINISTRATIVOS / GASTOS.ADMIN → 'administrativo'
PROOV.MATERIA.PRIMA → 'variable'
PROOVMANO.DE.OBRA → 'variable'
MANT.MAQ → 'operacional'
MOVILIDAD → 'operacional'
BANCO → 'financiero'
ARCA → 'financiero'
[Otros] → 'operacional' (por defecto)
```

### Procesamiento de Entradas:
```typescript
Si tipoOperacion === 'entrada':
  Si rubro='COBRO.VENTA' y subRubro='FLETE/COMISION/AJUSTE':
    → Ingresos Operacionales
  
  Si rubro='COBRO.VENTA' y subRubro='COBRO/ADEUDADO':
    → Ventas Legacy (ya contadas, skip)
  
  Si rubro='BANCO' y subRubro='AJUSTE DE BANCO/AJUSTE CAJA/AJUSTE':
    → Ingresos Operacionales (Ajustes Bancarios)
  
  Si subRubro='DEVOLUCION':
    → Ya procesado como NEGATIVO en Ventas Netas
```

---

## 🎯 ESTRUCTURA FINAL DEL REPORTE

```
ESTADO DE RESULTADOS
Período: [fecha inicio - fecha fin]

A. INGRESOS
  A.1 Ventas Netas
    - Ventas (Módulo Ventas)
    - Ventas (Registros Manuales)
    - Devoluciones (negativo)
    Total Ventas Netas: $XX,XXX
  
  A.2 Ingresos Operacionales
    - Ingresos por Flete
    - Comisiones Cobradas
    - Ajustes Bancarios
    Total Ingresos Operacionales: $XX,XXX
  
  A. TOTAL INGRESOS: $XX,XXX

B. COSTO DE VENTAS
  - Materia Prima - Alambre
  - Materiales de Embalaje
  - Mano de Obra - [categorías]
  B. TOTAL COSTO DE VENTAS: $XX,XXX

MARGEN BRUTO: $XX,XXX (XX.X%)

C. GASTOS OPERACIONALES
  C.1 Gastos Fijos
    - Energía Eléctrica
    - Servicios de Agua
    - etc.
    Total Gastos Fijos: $XX,XXX
  
  C.2 Gastos de Personal
    - Sueldos - [categorías]
    - Adelantos
    Total Personal: $XX,XXX
  
  C.3 Gastos Administrativos
    - Honorarios Profesionales
    - Impuestos
    Total Administrativos: $XX,XXX
  
  C.4 Gastos Operacionales
    - Mantenimiento Mecánico
    - Combustible
    Total Operacionales: $XX,XXX
  
  C. TOTAL GASTOS OPERACIONALES: $XX,XXX

MARGEN OPERACIONAL: $XX,XXX (XX.X%)

D. GASTOS FINANCIEROS
  ℹ️ Nota: Amortización de Préstamos se muestra pero NO se suma al total
  
  - Amortización de Préstamos: $10,000 (no sumado)
  - Intereses de Préstamos: $500 ✓
  - Comisiones Bancarias: $200 ✓
  - Impuestos - IVA: $1,500 ✓
  D. TOTAL GASTOS FINANCIEROS: $2,200 (excluye amortización)

MARGEN NETO: $XX,XXX (XX.X%)

INDICADORES:
  - Punto de Equilibrio: $XX,XXX
  - Índice de Rentabilidad: XX.X%
```

---

## ⚠️ REGLAS IMPORTANTES

1. **No duplicar ventas**: Los registros con `rubro='COBRO.VENTA'` y `subRubro='COBRO/ADEUDADO'` se cuentan SOLO en Ventas Legacy, NO en flujo de cobros.

2. **Devoluciones negativas**: Las devoluciones se restan de las ventas brutas, no se suman.

3. **Ajustes de banco/caja**: Son ingresos operacionales, NO ventas.

4. **Clasificación por defecto**: Cualquier rubro no reconocido va a "Gastos Operacionales".

5. **Personal por concepto**: Los gastos de personal se clasifican según el campo `concepto`, no solo `subRubro`.

6. **Capital de préstamos NO es gasto**: La amortización (pago de capital) se muestra en el reporte para transparencia del flujo de caja, pero NO se suma al total de gastos financieros. Solo los **intereses** son gasto contable real.

---

## 🔧 PARA AGREGAR NUEVAS CATEGORÍAS

### Para agregar un nuevo rubro de INGRESOS:
1. Modificar lógica en líneas 235-248 de `AccountingReport.tsx`
2. Agregar condición en procesamiento de `tipoOperacion='entrada'`
3. Crear función de categorización si es necesario

### Para agregar un nuevo rubro de GASTOS:
1. Agregar case en función `classifyExpense()` (líneas 408-428)
2. Crear función específica de categorización (ej: `getNewCategory()`)
3. Agregar case en switch de línea 252

### Para modificar categorías existentes:
1. Localizar función de categorización correspondiente (líneas 430-563)
2. Agregar/modificar cases según `subRubro` o `concepto`

---

**Última actualización:** 6 de noviembre de 2025  
**Versión:** 2.0 (con soporte para ventas legacy y ajustes bancarios)
