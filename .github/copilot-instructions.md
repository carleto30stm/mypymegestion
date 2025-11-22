# Instrucciones para agentes AI (repositorio myGestor)

Breve: este proyecto es una aplicación fullstack (React + Vite en frontend, Node/Express + TypeScript + Mongoose en backend) para gestionar gastos con autenticación por JWT y roles (admin / oper_ad / oper). Estas notas recogen lo esencial que un agente necesita para ser productivo rápidamente en cambios, debugging y PRs.

1) Comandos claves
  - Backend (desarrollo):
    - cd backend; npm install; cp .env.example .env; npm run dev  # arranca nodemon + ts-node
  - Frontend (desarrollo):
    - cd frontend; npm install; cp .env.example .env; npm run dev  # arranca Vite
  - Frontend (build):
    - cd frontend; npm run build  # tsc + vite build
  - Backend (build/run prod):
    - cd backend; npm run build; npm run start

2) Arquitectura y límites de servicio (por qué está así)
  - Frontend: React + TypeScript + Material UI; estado global con Redux Toolkit en `frontend/redux/`.
    - `frontend/services/api.ts` es el cliente axios central: añade Authorization desde localStorage y redirige al login si el token expiró.
  - Backend: Express + TypeScript + Mongoose en `backend/src/`.
    - `backend/src/models/Gasto.ts` contiene esquema y validación por rubro/subRubro; actualizarlo cuando añadas rubros.
  - Comunicación: todas las llamadas REST usan prefijo `/api/*`. Ejemplos: `/api/auth` (login), `/api/gastos` (CRUD gastos).
  - **CRÍTICO - Prefijo /api en Redux slices**: SIEMPRE usar el prefijo `/api` en las URLs de los thunks de Redux. El cliente axios (`services/api.ts`) tiene configurado `baseURL` que ya incluye el dominio, pero las rutas DEBEN empezar con `/api`. Ejemplo correcto: `api.get('/api/ventas/estadisticas')`, NO `api.get('/ventas/estadisticas')`.

3) Estado y autenticación (puntos críticos que rompen roles)
  - Tokens y persistencia:
    - Token y metadatos se guardan en localStorage: `token`, `tokenExpiration`, `user`.
    - `frontend/redux/slices/authSlice.ts` rehidrata `user` desde `localStorage` al cargar la app. Revisa ese archivo al tocar autenticación o expiración.
  - Expiración: el backend y frontend usan 12 horas por diseño; `authSlice` calcula expiration y `services/api.ts` bloquea/redirige si expiró.

4) Convenciones específicas del proyecto (no genéricas)
  - **Enums centralizados**: TODOS los enums deben estar centralizados en archivos Types:
    - Backend: `backend/src/Types/Types.ts` → exportar como `const` arrays (ej: `export const ESTADOS_REMITO = ['pendiente', 'en_transito', ...] as const`)
    - Frontend: `frontend/types.ts` → importar o definir los mismos valores
    - **NUNCA hardcodear enums** directamente en modelos/interfaces (ej: NO usar `estado: 'pendiente' | 'en_transito' | ...` en interfaces)
    - En su lugar: definir el enum en Types.ts y usar `typeof ESTADOS_REMITO[number]` para el tipo
    - Esto permite reutilizar valores en validaciones, selects, filtros, etc.
    - **Enums de Ventas centralizados**: ESTADOS_VENTA, ESTADOS_ENTREGA, ESTADOS_COBRANZA, ESTADOS_CHEQUE ya están en Types.ts
    - **IMPORTANTE - Inconsistencia de enums de medio de pago**: Existen DOS enums diferentes:
      - `MEDIO_PAGO` en `Types.ts` (usado por Gasto): tiene `'CHEQUE TERCERO'`, `'CHEQUE PROPIO'`, `'TARJETA DÉBITO'`, `'TARJETA CRÉDITO'`, `'CUENTA CORRIENTE'`
      - `MEDIOS_PAGO` en `ReciboPago.ts` (usado por ReciboPago): tiene `'CHEQUE'`, `'TARJETA_DEBITO'`, `'TARJETA_CREDITO'`, `'CUENTA_CORRIENTE'`
      - El controlador `recibosController.ts` mapea entre ambos al crear Gastos desde ReciboPagos (líneas 232-245)
      - Al trabajar con pagos/cobros, usar SIEMPRE el mapeo correcto según el contexto
  - Rubro / SubRubro: la lista autorizada está duplicada en backend y frontend:
    - Backend: `backend/src/models/Gasto.ts` -> `subRubrosByRubro`.
    - Frontend: `frontend/types.ts` -> `subRubrosByRubro` y unión en la interfaz `Gasto`.
    - Si añades o renombras un rubro, actualiza ambos archivos para evitar validaciones fallidas.
  - Al cancelar un gasto: es obligatorio enviar `comentario` (UI valida y backend guarda). Revisa las rutas PATCH en `backend/src/routes/gastos.ts`.
  - Para cheques: hay campos específicos (`estadoCheque`, `chequeRelacionadoId`). Cambios en esa lógica afectan tanto UI como endpoints (acción `confirmarCheque` y `disponerCheque` en `frontend/services/api.ts`).
  - **IVA en Ventas (decisión por venta, no por cliente)**:
    - El campo `aplicaIVA` en modelo Venta es una **decisión por transacción**, NO heredado automáticamente del Cliente.
    - `Cliente.aplicaIVA` es solo una sugerencia inicial (cliente frecuentemente exento), pero el usuario DEBE poder decidir en cada venta.
    - Razón: un mismo cliente puede comprar con factura A/B (con IVA 21%) o sin factura/factura X (sin IVA), según la situación.
    - Frontend: `VentasPage.tsx` tiene checkbox `aplicaIVAVenta` controlado por el usuario, que se envía en el body al crear venta.
    - Backend: `ventasController.crearVenta` acepta `aplicaIVA` del request body; el cálculo de IVA usa ese valor (línea 151).
  - **Auditoría de anulaciones en Ventas**:
    - Al anular una venta, es OBLIGATORIO registrar: `motivoAnulacion` (string), `usuarioAnulacion` (string), `fechaAnulacion` (Date).
    - `ventasController.anularVenta` valida ambos campos y los guarda en el documento.
    - Esto permite trazabilidad completa de quién, cuándo y por qué se anuló una venta.
  - **Manejo de Cheques - Componente Reutilizable**:
    - **SIEMPRE usar** `frontend/components/FormaPagoModal.tsx` para manejar cheques (y cualquier forma de pago).
    - Este componente maneja: datos de cheque, transferencias, tarjetas, efectivo, validaciones completas.
    - Campos obligatorios para cheques: `numeroCheque`, `bancoEmisor`, `titularCheque`, `fechaVencimiento`.
    - Auto-calcula fecha de vencimiento si el cliente tiene `diasVencimientoCheques` configurado.
    - Valida que clientes con `aceptaCheques: false` no puedan pagar con cheque.
    - Ubicación backend: `backend/src/models/ReciboPago.ts` tiene `IDatosCheque` y validaciones.
    - **Registro en Gastos**: El campo `numeroCheque` en modelo Gasto registra el número cuando medioDePago incluye 'CHEQUE'.
    - El controlador `recibosController.ts` mapea automáticamente el numeroCheque de ReciboPago a Gasto al crear cobros.
  - **Manejo de Transferencias (Cobros)**:
    - `FormaPago.banco`: la CAJA de destino donde impacta el cobro (PROVINCIA, SANTANDER, etc) - **OBLIGATORIO** para transferencias.
    - `DatosTransferencia.numeroOperacion`: número de transacción/orden bancaria del cobro recibido.
    - NO confundir con transferencias entre cuentas propias (eso es `tipoOperacion: 'transferencia'` en Gasto).
    - En cobros por transferencia: el cliente transfiere a nuestra cuenta → registramos entrada en la caja seleccionada.
  - **Formatos de Datos - Utils Centralizados**:
    - **Fechas**: SIEMPRE usar formato `dd/mm/yyyy` para display.
    - `frontend/utils/formatters.ts` tiene funciones centralizadas:
      - `formatDate(dateString)`: convierte ISO a dd/mm/yyyy
      - `formatDateForDisplay(dateString)`: formato legible (ej: "1 ene 2024")
      - `parseDate(dateString)`: convierte dd/mm/yyyy a ISO (yyyy-mm-dd)
    - **Moneda**: formato argentino con separadores de miles y decimales.
      - `formatCurrency(value)`: convierte número a "100.000,00"
      - `formatCurrencyWithSymbol(value)`: retorna "$ 100.000,00"
      - `parseCurrency(value)`: parsea string "100.000,00" a número
    - **CRÍTICO - Inputs de Moneda en Formularios**:
      - **SIEMPRE** usar formato argentino de moneda en inputs que representan dinero (precios, montos, totales, entrada, salida, debe, haber, etc).
      - **NO usar type="number"** para inputs de moneda - usar TextField con formateo manual.
      - **Patrón obligatorio**: usar funciones centralizadas de `utils/formatters.ts`
      - **Implementación estándar**:
        ```tsx
        import { formatNumberInput, getNumericValue, formatCurrency } from '../utils/formatters';
        
        // Estado para display formateado
        const [montoFormatted, setMontoFormatted] = useState('');
        
        // Handler: formatea mientras el usuario escribe
        const handleMontoChange = (value: string) => {
          const formatted = formatNumberInput(value);
          setMontoFormatted(formatted);
          const numericValue = getNumericValue(formatted);
          // Usar numericValue para cálculos/backend
        };
        
        // TextField
        <TextField
          value={formatCurrency(monto || 0)}
          onChange={(e) => handleMontoChange(e.target.value)}
          placeholder="0,00"
        />
        ```
      - **Funciones disponibles en utils/formatters.ts**:
        - `formatNumberInput(value)`: Formatea mientras el usuario escribe (permite comas, agrega puntos cada 3 dígitos)
        - `getNumericValue(formatted)`: Convierte formato argentino a número (1.000,50 → 1000.5)
        - `formatCurrency(value)`: Formatea número para display (1000 → "1.000,00")
        - `parseCurrency(value)`: Parsea string formateado a número
      - **Ejemplos de campos que DEBEN usar este formato**:
        - Gastos: entrada, salida, montos de transferencia
        - Ventas: precio unitario, subtotal, total, IVA, descuentos
        - Cobros: monto de cada forma de pago (efectivo, cheque, transferencia, tarjeta)
        - Cuenta Corriente: debe, haber, saldo, límite de crédito, montos de ajustes
        - Productos: precio, costo
        - Clientes: límite de crédito, saldo
      - **Referencia**: Ver `FormaPagoModal.tsx` y `ExpenseForm.tsx` como ejemplos de implementación correcta.
    - **NO reinventar formatos** - usar estas funciones en todo el proyecto.
  - **Componentes Reutilizables - UI/UX**:
    - **ConfirmDialog**: Modal de confirmación reutilizable en `frontend/components/modal/ConfirmDialog.tsx`
      - **Uso obligatorio**: SIEMPRE usar este componente para confirmar acciones críticas (eliminar, cancelar, modificar datos financieros)
      - **Patrón de implementación**:
        ```tsx
        import { ConfirmDialog } from '@/components/modal';
        
        const [openConfirm, setOpenConfirm] = useState(false);
        
        <ConfirmDialog
          open={openConfirm}
          onClose={() => setOpenConfirm(false)}
          onConfirm={handleAction}
          title="¿Confirmar acción?"
          message="Descripción clara de lo que sucederá al confirmar"
          confirmText="Confirmar"
          cancelText="Cancelar"
          severity="warning" // 'warning' | 'error' | 'info' | 'question'
          confirmColor="primary" // 'primary' | 'error' | 'warning' | 'info' | 'success'
          showAlert={true} // true=Alert con ícono, false=DialogContentText simple
        />
        ```
      - **Props disponibles**:
        - `severity`: Tipo visual ('warning'=amarillo, 'error'=rojo, 'info'=azul, 'question'=ayuda)
        - `confirmColor`: Color del botón de confirmación
        - `showAlert`: true muestra Alert con ícono, false muestra texto simple
      - **Casos de uso comunes**:
        - Eliminar registros: `severity="error"`, `confirmColor="error"`
        - Cancelar operaciones: `severity="warning"`, `confirmColor="warning"`
        - Confirmar acciones financieras: `severity="warning"`, `confirmColor="primary"`
        - Información/ayuda: `severity="question"`, `confirmColor="info"`
      - **Ejemplo real**: Ver `frontend/components/table/AdelantosTab.tsx` líneas 282-291
    - **FormaPagoModal**: Componente ÚNICO para manejo de cheques, transferencias, tarjetas y efectivo
      - Ubicación: `frontend/components/FormaPagoModal.tsx`
      - Maneja validaciones completas de cada medio de pago
      - Auto-calcula fechas de vencimiento para cheques
      - Valida restricciones de cliente (ej: aceptaCheques)
    - **NO crear modales de confirmación custom** - usar ConfirmDialog en su lugar

5) Archivos clave para mirar antes de editar
  - `frontend/redux/slices/authSlice.ts` — rehidratación, tokenExpiration, guardado de `user` en localStorage.
  - `frontend/redux/store.ts` — middleware (redux-logger en dev), serializableCheck personalizado.
  - `frontend/services/api.ts` — baseURL, interceptors, manejo 401/expiración.
  - `frontend/components/ExpenseTable.tsx` — lógica UI para permisos (el lugar más común donde se comprueba `user.userType`).
  - `frontend/components/FormaPagoModal.tsx` — componente ÚNICO para manejo de cheques, transferencias, tarjetas y efectivo.
  - `frontend/components/modal/ConfirmDialog.tsx` — modal de confirmación reutilizable para acciones críticas.
  - `frontend/utils/formatters.ts` — funciones centralizadas de formato (fechas dd/mm/yyyy, moneda argentina).
  - `frontend/types.ts` — tipos centrales (User, Gasto, Venta) y enums centralizados (ESTADOS_VENTA, etc).
  - `backend/src/Types/Types.ts` — enums centralizados del backend (ESTADOS_VENTA, CAJAS, MEDIO_PAGO, etc).
  - `backend/src/models/Gasto.ts` — esquema y validaciones por rubro/subrubro.
  - `backend/src/models/Venta.ts` — modelo de ventas con enums centralizados y validaciones.
  - `backend/src/models/ReciboPago.ts` — modelo de recibos con IDatosCheque y formasPago.
  - `backend/src/routes/gastos.ts` — endpoints de cancel/re-activar/eliminar/confirmar.
  - `backend/src/server.ts` — punto de entrada, variables de entorno esperadas.

6) Patterns y decisiones observadas (ejemplos concretos)
  - Persistencia ligera: se confía en `localStorage` para rehidratación; busca `localStorage.getItem('user')` y `tokenExpiration` en el frontend.
  - Validación compartida: subRubros están validados en el backend (Mongoose) y en frontend (tipos/constantes). Evitar desincronización.
  - Manejo de expiración: `api.ts` intercepta peticiones y redirige a `/login` en 401 o token expirado.
  - **Venta.medioPago vs ReciboPago.formasPago**: NO son redundantes, son complementarios:
    - `Venta.medioPago` registra el medio INICIAL (EFECTIVO, CHEQUE, CUENTA_CORRIENTE, etc) - crítico para: 1) Identificar ventas a crédito (CUENTA_CORRIENTE) que afectan saldo del cliente, 2) Estadísticas y reportes (ventasPorMedioPago).
    - `ReciboPago.formasPago[]` registra los cobros REALES posteriores con detalles completos (múltiples medios, datos de cheque, etc).
    - Flujo: Venta se crea con medioPago → luego se cobran con ReciboPago que tiene formasPago[] detalladas.

7) Debugging rápido / dónde mirar logs
  - Frontend: activar `console.log` desde `authSlice` y redux-logger (ya habilitado en dev). Revisar `frontend/services/api.ts` logs de expiración.
  - Backend: `npm run dev` usa `nodemon` con ts-node; errores de tipo/validación salen en consola. Modelos con validaciones Mongoose lanzan mensajes claros.

8) Pull request checklist para agentes
  - ¿Actualizaste `subRubrosByRubro` en backend y frontend si tocaste rubros? (sí/no)
  - ¿Verificaste que `authSlice` rehidrata `user` y no rompe roles después de reload?
  - ¿Probaste flujo de login -> crear/editar/cancelar/reactivar gasto como `admin` y `oper_ad`?
  - ¿Agregaste tests/manual steps en el PR description si cambias comportamiento del auth o validaciones?

9) Qué no hacer (errores comunes vistos)
  - No modificar solo el frontend al cambiar rubros; romperá la validación backend y producirá errores al crear gastos.
  - No asumir que `localStorage` siempre contiene `user` — `authSlice` parsea y valida; el agente debe respetar esa convención.
  - **CRÍTICO: NO crear modelos/tablas redundantes sin investigar primero** — SIEMPRE revisar si ya existe una tabla/modelo que cumpla la función antes de crear nuevos. Ejemplo: el modelo `Gasto` ya maneja tanto egresos (tipoOperacion: 'salida') como ingresos (tipoOperacion: 'entrada') y es usado por `BankSummary`. No crear `MovimientoCaja`, `Caja` u otros modelos que dupliquen esta funcionalidad.
  - **NO hardcodear enums en interfaces/modelos** — Ejemplo incorrecto: `estado: 'pendiente' | 'en_transito' | 'entregado'` directamente en una interface. Correcto: definir `ESTADOS_REMITO` en Types.ts y usar `typeof ESTADOS_REMITO[number]`. Esto permite reutilización en selects, validaciones, filtros.

10) Sistema de registros financieros (IMPORTANTE)
  - **Tabla única para movimientos financieros**: `backend/src/models/Gasto.ts`
    - Maneja TODOS los movimientos: ingresos, egresos y transferencias
    - `tipoOperacion`: 'entrada' (ingresos/cobros), 'salida' (egresos/pagos), 'transferencia' (entre cuentas)
    - `rubro` y `subRubro`: categorización de movimientos (ver `backend/src/Types/Types.ts` -> `subRubrosByRubro`)
    - `banco`: cuenta/caja donde se registra (PROVINCIA, SANTANDER, EFECTIVO, FCI, RESERVA)
    - `entrada` / `salida`: montos según tipo de operación
    - `confirmado`: true/false (para cheques diferidos)
  - **BankSummary**: `frontend/components/BankSummary.tsx` 
    - Lee de `state.gastos.items` (tabla Gasto)
    - Calcula saldos por banco sumando entradas y restando salidas
    - NO crear tablas separadas de "cajas" o "movimientos" — usar Gasto
  - **Para registrar cobros de ventas**:
    - Crear Gasto con `tipoOperacion: 'entrada'`, `rubro: 'COBRO.VENTA'`, `subRubro: 'COBRO'`
    - Asignar al `banco` correspondiente según medio de pago
    - Ver `backend/src/controllers/recibosController.ts` (líneas ~225-245) como referencia

11) **Sistema de Cuenta Corriente (CRÍTICO)**
  - **Arquitectura de doble contabilidad**: `Gasto` maneja MOVIMIENTOS DE CAJA, `MovimientoCuentaCorriente` maneja DEUDAS DE CLIENTES
  - **REGLA CONTABLE FUNDAMENTAL**: 
    - Venta a crédito (medio de pago CUENTA_CORRIENTE) → **NO registra Gasto** (no hay ingreso físico), solo MovimientoCuentaCorriente (debe)
    - Cobro posterior (ReciboPago con efectivo/cheque/transferencia) → **SÍ registra Gasto** (entrada a caja) + MovimientoCuentaCorriente (haber)
    - Si ReciboPago incluye formaPago con medioPago='CUENTA_CORRIENTE' → **NO crear Gasto** para esa forma de pago
  - **Modelo backend**: `backend/src/models/MovimientoCuentaCorriente.ts`
    - Registra TODAS las transacciones con clientes: ventas (debe), cobros (haber), ajustes
    - Tipos: 'venta', 'recibo', 'nota_credito', 'nota_debito', 'ajuste_cargo', 'ajuste_descuento'
    - `debe`: incrementa deuda del cliente (ventas, ND, ajustes cargo)
    - `haber`: reduce deuda del cliente (cobros, NC, ajustes descuento)
    - `saldo`: saldo ACUMULADO después de cada movimiento (CRÍTICO: calcula en orden cronológico)
    - **CONVENCIÓN DE SIGNOS (Cuenta Deudora)**:
      - Saldo POSITIVO (+) = cliente DEBE dinero (deuda)
      - Saldo NEGATIVO (-) = cliente tiene SALDO A FAVOR (anticipo/crédito)
      - Fórmula: `nuevoSaldo = saldoAnterior + debe - haber`
      - Crédito disponible: `limiteCredito - saldo` (si saldo negativo, suma al límite)
    - **Índices compuestos**: {clienteId, fecha}, {clienteId, tipo, fecha}, {clienteId, anulado, fecha}
  - **Controlador**: `backend/src/controllers/cuentaCorrienteController.ts`
    - `getMovimientos`: historial completo con filtros (fecha, tipo, incluirAnulados)
    - `getResumen`: saldo actual, disponible, porcentaje uso, estado (al_dia/proximo_limite/limite_excedido/moroso)
    - `getAntiguedadDeuda`: clasifica deuda en 0-30, 31-60, 61-90, +90 días
    - `crearAjuste`: solo admin/oper_ad pueden crear ajustes manuales
    - `anularMovimiento`: solo admin puede anular (recalcula saldos posteriores automáticamente)
  - **Rutas**: `/api/cuenta-corriente` (todas requieren autenticación)
    - GET `/:clienteId/movimientos` - query params: desde, hasta, tipo, incluirAnulados
    - GET `/:clienteId/resumen` - resumen completo de estado de cuenta
    - GET `/:clienteId/antiguedad` - análisis de vencimientos
    - POST `/ajuste` - crear ajuste manual (requiere tipo, monto, concepto)
    - PATCH `/movimientos/:movimientoId/anular` - anular movimiento (requiere motivo)
  - **Registro automático de movimientos**:
    - **Al confirmar venta**: `ventasController.confirmarVenta` crea movimiento tipo 'venta' con debe=total
    - **Al crear recibo**: `recibosController.crearRecibo` crea movimiento tipo 'recibo' con haber=totalCobrado
    - SIEMPRE usar transacciones para mantener consistencia entre Cliente.saldoCuenta y MovimientoCuentaCorriente.saldo
  - **Frontend**: `frontend/redux/slices/cuentaCorrienteSlice.ts`
    - Actions: fetchMovimientos, fetchResumen, fetchAntiguedad, crearAjuste, anularMovimiento
    - State: { movimientos, resumen, antiguedad, loading, error }
  - **Componente**: `frontend/components/CuentaCorrienteDetalle.tsx`
    - Resumen visual: límite, saldo, disponible, porcentaje uso, estado (con LinearProgress)
    - **Botón "Registrar Pago Real"**: visible solo cuando hay deuda (saldo > 0)
    - Modal de pago con FormaPagoModal reutilizable: efectivo, cheque, transferencia, tarjeta
    - Antigüedad: 4 cards coloreadas (corriente=verde, 30d=amarillo, 60d=naranja, +90d=rojo)
    - Tabla de movimientos: fecha, tipo, documento, concepto, debe/haber (coloreados), saldo
    - Modal crear ajuste: tipo (cargo/descuento), monto, concepto, observaciones
    - Etiquetas visuales: "Debe" en rojo vs "A favor" en verde para saldos positivos/negativos
  - **Integración**: `frontend/pages/CobranzasPage.tsx` Tab 3 "Cuenta Corriente"
  - **Reglas de negocio**:
    - Saldo positivo = cliente debe dinero (cuenta deudora)
    - Saldo negativo = cliente tiene saldo a favor (anticipo)
    - Estado 'moroso' si saldoCuenta > limiteCredito
    - Límite de crédito se controla en cada venta nueva
    - Ajustes manuales requieren concepto obligatorio y quedan auditados con usuario creador
  - **Cobros con forma de pago CUENTA_CORRIENTE** (IMPORTANTE - cambio de lógica):
    - **USO CORRECTO**: Solo para registrar cambio de estado en venta, NO es cobro real
    - **Flujo completo**:
      1. Venta a crédito (medio pago CUENTA_CORRIENTE) → crea MovimientoCuentaCorriente con debe (genera deuda)
      2. ReciboPago con forma de pago CUENTA_CORRIENTE → marca venta como pagada pero NO reduce deuda ni impacta caja
      3. Cliente paga REALMENTE (efectivo/cheque/transferencia) → crea MovimientoCuentaCorriente con haber (reduce deuda) + Gasto (entrada a caja)
    - **Ejemplo**: Cliente debe $10.000, crea ReciboPago con CC $10.000 → venta.estadoCobranza='pagado' pero saldoCuenta sigue en +$10.000
    - **Posteriormente**: Cliente entrega efectivo $10.000 → crea NUEVO ReciboPago con efectivo $10.000 → ahí SÍ reduce deuda y registra entrada a caja
  - **Cobros Mixtos (múltiples formas de pago)**:
    - **Ejemplo**: Recibo con Efectivo $2.000 + Cuenta Corriente $3.000 = Total $5.000
    - **Registro en MovimientoCuentaCorriente**: tipo='recibo', haber=$2.000 (reduce deuda SOLO por efectivo)
    - **Registro en Gasto**: $2.000 (efectivo que ingresó a caja)
    - **Cuenta Corriente del cliente**: se reduce en $2.000 (solo pagos físicos)
    - **Los $3.000 de CC**: NO reducen deuda (siguen pendientes hasta que haya pago real)
    - **Reporte Contable**:
      - Flujo de Caja (Gasto): muestra SOLO ingresos físicos → $2.000
      - Cuenta Corriente (MovimientoCuentaCorriente): muestra SOLO cobros reales → $2.000 haber
      - Deuda pendiente: sigue existiendo para los $3.000 marcados como CC
  - **NO confundir**: MovimientoCuentaCorriente (deuda cliente) ≠ Gasto (movimiento caja/banco)

12) **Reporte Contable - Reconciliación Flujo de Caja vs Cuenta Corriente**
  - **Problema común**: "Registré un cobro de $5.000 pero en caja solo entró $2.000"
  - **Explicación**: Sistema diferencia entre INGRESO FÍSICO y REDUCCIÓN DE DEUDA
  - **Tablas involucradas**:
    - `Gasto`: registra movimientos FÍSICOS de dinero (entrada/salida de caja/banco)
    - `MovimientoCuentaCorriente`: registra operaciones con clientes (ventas=debe, cobros=haber)
  - **Ejemplo práctico - Cobro mixto**:
    ```
    Cliente debe: $10.000 (saldo = +10.000)
    Recibo creado con:
      - Efectivo: $2.000
      - Cheque: $3.000  
      - Cuenta Corriente: $3.000 (marcado como pagado, pero SIN reducir deuda)
      Total recibo: $8.000
    
    Resultado:
    ✅ Gasto (Caja):
       - Entrada efectivo: $2.000 (banco: EFECTIVO)
       - Entrada cheque: $3.000 (banco: PROVINCIA)
       - Total en Gasto: $5.000
    
    ✅ MovimientoCuentaCorriente:
       - Tipo: 'recibo'
       - Haber: $5.000 (reduce deuda SOLO por pagos físicos)
       - Saldo anterior: +10.000 → Saldo nuevo: +5.000 (aún debe $5.000)
    
    ✅ Reconciliación:
       - Ingreso físico a caja: $5.000
       - Reducción de deuda: $5.000
       - Los $3.000 de CC: NO impactan ni en caja ni en deuda (solo marcan venta como pagada)
       - Deuda real pendiente: $5.000 (de los cuales $3.000 están "marcados como pagados")
    
    ✅ Crédito disponible:
       - Límite: $70.000
       - Saldo actual: +5.000 (debe)
       - Disponible: 70.000 - 5.000 = $65.000
    ```
  - **Ejemplo práctico - Ajuste descuento (condonación)**:
    ```
    Cliente debe: $5.000 (saldo = +5.000)
    Ajuste descuento: $3.000
    
    Resultado:
    ✅ MovimientoCuentaCorriente:
       - Tipo: 'ajuste_descuento'
       - Haber: $3.000
       - Saldo anterior: +5.000 → Saldo nuevo: +2.000 (ahora debe solo $2.000)
    
    ✅ Si cliente no debía nada:
       - Saldo anterior: 0
       - Ajuste descuento: $3.000
       - Saldo nuevo: -3.000 (tiene $3.000 a favor - anticipo)
       - Crédito disponible: 70.000 - (-3.000) = $73.000 ✓
    ```
  - **Cuándo usar CUENTA_CORRIENTE como forma de pago en ReciboPago**:
    - ❌ **NUNCA usar para registrar pagos reales del cliente**
    - ✅ Solo usar para cambiar estado de venta sin impactar deuda/caja
    - Después, crear NUEVO ReciboPago con forma de pago real (efectivo/cheque/transferencia)
    - **Alternativas correctas según caso de uso**:
      - Cliente pagó realmente → ReciboPago con efectivo/cheque/transferencia (impacta caja + reduce deuda)
      - Condonar deuda sin pago → Ajuste Descuento en cuenta corriente (reduce deuda, no impacta caja)
      - Aplicar saldo a favor → Ajuste Descuento (reduce deuda usando crédito previo)
      - Nota de crédito → Ajuste Descuento con concepto específico
  - **Reporte "Flujo de Caja vs Cuenta Corriente"** (a implementar):
    - Período: fecha inicio - fecha fin
    - Columnas: Cliente, Total Cobrado (haber CC), Ingreso Físico (Gasto), Reducción Deuda (diferencia)
    - Totales: Suma(haber) = Suma(ingresos) + Suma(reducciones)
    - Validación: Si no cuadra, hay inconsistencia en registros

13) **UI para Regularizar Deuda (Implementado)**
  - **Ubicación**: `CobranzasPage` → Tab "Cuenta Corriente" → Botón "Registrar Pago Real"
  - **Flujo de Usuario**:
    1. Seleccionar cliente con deuda (saldo > 0)
    2. Ver resumen con alerta destacada mostrando deuda pendiente
    3. Click en "Registrar Pago Real" (botón verde con ícono Payment)
    4. Modal muestra:
       - Alert info: "Pago Parcial Permitido" con explicación
       - Deuda Total vs Monto a Pagar Ahora vs Quedará Pendiente
       - FormaPagoModal con todas las opciones (efectivo, cheque, transferencia, tarjeta)
    5. Seleccionar forma(s) de pago y montos (puede ser menor al total)
    6. Completar datos específicos (ej: datos cheque si aplica)
    7. Confirmar pago
    8. **Resultado automático**:
       - ✅ Crea ReciboPago con formasPago reales
       - ✅ Crea MovimientoCuentaCorriente con haber (reduce deuda por monto pagado)
       - ✅ Actualiza Cliente.saldoCuenta (deuda reducida, no necesariamente a 0)
       - ✅ Crea Gasto(s) con entrada a caja/banco correspondiente
       - ✅ Refresca vista de cuenta corriente mostrando nuevo saldo
       - ✅ Mensaje de éxito indica si pago fue total o parcial + saldo restante
  - **Validaciones UI**:
    - Botón solo visible si saldo > 0 (hay deuda)
    - Alert warning explica para qué sirve el botón
    - Reutiliza FormaPagoModal (mismo componente usado en ventas) con `permitirPagoParcial={true}`
    - Maneja pagos mixtos (ej: $2.000 efectivo + $3.000 cheque)
    - Botón confirmar habilitado si totalPagado > 0 (no requiere cubrir deuda completa)
  - **Soporte de Pagos Parciales**:
    - Prop `permitirPagoParcial` en FormaPagoModal permite montos menores al total
    - Labels cambian: "Deuda Total" / "Monto a Pagar Ahora" / "Quedará Pendiente"
    - Validación: solo requiere totalPagado > 0 (no totalPagado >= montoTotal)
    - Mensaje post-pago diferencia entre pago completo vs parcial
    - Ejemplo: Cliente debe $10.000 → paga $3.000 → saldo actualizado a $7.000 → puede pagar resto después
  - **Casos especiales manejados**:
    - Si cliente tiene saldo a favor (saldo < 0): muestra Alert success con mensaje explicativo
    - FormaPagoModal valida automáticamente: clientes sin aceptaCheques no pueden pagar con cheque
    - Calcula fecha vencimiento cheque si cliente tiene diasVencimientoCheques configurado
  - **Diferencia con Ajuste Descuento**:
    - "Registrar Pago Real" → hay ingreso físico de dinero → impacta caja + reduce deuda
    - "Crear Ajuste Descuento" → NO hay ingreso → solo reduce deuda (condonación/NC)
  - **Implementación Backend** (`recibosController.crearRecibo`):
    - **Flag esRegularizacion**: `!ventasIds || !Array.isArray(ventasIds) || ventasIds.length === 0`
    - **Validación condicional**:
      - SIEMPRE requerido: `clienteId`
      - Solo si `!esRegularizacion`: validar que todas las ventas existen y pertenecen al mismo cliente
    - **Procesamiento condicional**:
      - Si `esRegularizacion=false`: procesa ventas, calcula saldos, distribuye pagos, actualiza ventas
      - Si `esRegularizacion=true`: obtiene cliente directo de BD, totalACobrar=totalFormasPago, ventasRelacionadas=[]
    - **Datos del cliente**: SIEMPRE obtiene de `Cliente.findById(clienteId)` (no de ventas[0])
      - `nombreCliente`: `cliente.razonSocial || apellido + nombre`
      - `documentoCliente`: `cliente.numeroDocumento`
    - **ReciboPago.totales**: ajustado según contexto
      - Si `esRegularizacion`: `totalACobrar=totalFormasPago, vuelto=0, saldoPendiente=0`
      - Si no: calcula normal con posible vuelto/saldo pendiente
    - **ReciboPago.momentoCobro**: siempre 'diferido' si no se especifica (el enum permite 'anticipado', 'contra_entrega', 'diferido', 'posterior')
    - **ReciboPago.observaciones**: si `esRegularizacion` y no provistas, usa 'Regularización de deuda - Pago directo'
    - **ReciboPago.ventasRelacionadas**: array vacío permitido para regularizaciones (modelo modificado para soportar esto)
    - **ReciboPago.creadoPor**: debe ser ObjectId (user.id), NO username (user.username)
    - **Actualización de ventas**: solo si `!esRegularizacion` actualiza recibosRelacionados y ultimaCobranza
    - **Gastos creados**: SIEMPRE se crean para formasPagoReales (excluyendo CUENTA_CORRIENTE), con `clientes: nombreCliente`
    - **MovimientoCuentaCorriente**: SIEMPRE se crea si totalCobradoReal > 0, con haber=totalCobradoReal (reduce deuda)
    - **Validación modelo ReciboPago ajustada**:
      - `ventasRelacionadas` ya NO requiere mínimo 1 elemento (permite array vacío)
      - Middleware pre-save solo valida totalACobrar contra ventas si hay ventasRelacionadas
      - Enum MOMENTO_COBRO incluye 'posterior' además de 'anticipado', 'contra_entrega', 'diferido'

Si quieres, actualizo este archivo con ejemplos concretos de endpoints (ej: rutas en `backend/src/routes/gastos.ts`) o añado sección de debugging paso a paso. ¿Hay algo que te gustaría ampliar o cambiar?
usa los archivos recientemente editados como referencia para entender mejor los cambios realizados.
usa los archivos de barril index.ts para hacer las importaciones
no harcoder valores si es posible en ves de eso usa enum que se pueda reutilizar
los inputs de los formularios deben usar el formato de currency donde corresponda (ej: precios, montos). ./frontend/utils/formatters.ts tiene funciones útiles para esto.