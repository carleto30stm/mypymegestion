
// Define valid subRubros for each rubro
export const subRubrosByRubro: Record<string, string[]> = {
  'SERVICIOS': ['ELECTRICIDAD', 'PROGRAMACION', 'AGUA', 'GAS', 'Servicios de Internet/Telecomunicaciones', 'JARDIN','LIMPIEZA'],
  'COBRO.VENTA': ['DEVOLUCION', 'COBRO', 'ADEUDADO', 'FLETE', 'COMISION', 'AJUSTE',],
  'DEVOLUCION': ['DEVOLUCION A CLIENTE'], // Devoluciones de dinero a clientes
  'PROOV.MATERIA.PRIMA': ['ALAMBRE INDUSTRIA', 'ALAMBRE RAUP', 'EMBALAJE', 'POLIESTIRENO', 'FUNDICION', 'PORTARRETRATOS', 'LLAVEROS Y PORTA', 'COMPRA DE MATERIAS PRIMAS' ],
  'PROOVMANO.DE.OBRA': ['PORTA RETRATOS', 'SIN/FINES', 'INYECCION DE PLASTICO', 'TRIANGULOS', 'ARGOLLAS', 'GALVANO CADENAS', 'GALVANO CABEZALES', 'ARMADORAS'],
  'BANCO': ['MOVIMIENTOS AJUSTE', 'MOV.BANC', 'AJUSTE DE BANCO','AJUSTE CAJA','PRESTAMO','INTERES'],
  'ARCA': ['IVA'],
  'GASTOS ADMINISTRATIVOS': ['HONORARIOS', 'IMPUESTO BANCARIOS', 'IMPUESTO TARJETAS', 'VEPS', 'PLAN DE PAGO', 'MONOTRIBUTO', 'II.BB/SIRCREB', 'MANT. CTA.', 'CONSULTORIAS'],
  'MANT.EMPRESA': ['GASTOS OFICINA', 'REFRIGERIO', 'BOTIQUIN','ELECT./PLOMERIA/PINTURA','INDUMENTARIA','PAPELERA','COMPUTACION','ARTICULOS DE LIMPIEZA','OTROS'],
  'MANT.MAQ': ['MECANICO', 'MATERIALES', 'TORNERO','MAQ. NUEVA'],
  'MOVILIDAD': ['COMBUSTIBLE', 'PEAJES', 'ESTACIONAMIENTO','MECANICO','SERVICE']
};

// MEDIOS DE PAGO - Sistema Legacy (mantener por compatibilidad con Gastos)
export const MEDIO_PAGO = [
      'CHEQUE TERCERO',
      'CHEQUE PROPIO', 
      'EFECTIVO',
      'TRANSFERENCIA',
      'TARJETA DÉBITO',
      'TARJETA CRÉDITO',
      'RESERVA',
      'CUENTA CORRIENTE'
    ] as const;

// MEDIOS DE PAGO UNIFICADOS (NUEVO - Fase 2)
// Enum centralizado que reemplaza gradualmente a los anteriores
// Usar este enum para TODOS los nuevos desarrollos
export const MEDIOS_PAGO_UNIFICADO = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'CHEQUE_TERCERO',
  'CHEQUE_PROPIO',
  'TARJETA_DEBITO',
  'TARJETA_CREDITO',
  'CUENTA_CORRIENTE',
  'OTRO'
] as const;

// Bancos disponibles
export const CAJAS = ['PROVINCIA', 'SANTANDER', 'EFECTIVO', 'FCI', 'RESERVA'] as const;

export const UNIDADES_MEDIDA = ['UNIDAD', 'KG', 'LITRO', 'METRO', 'CAJA', 'PAQUETE'] as const;

// Estados de Ventas (LEGACY - mantener por compatibilidad)
export const ESTADOS_VENTA = ['pendiente', 'confirmada', 'anulada', 'parcial'] as const;

// Estados de Ventas Granulares (NUEVO - Fase 2)
// Reflejan el ciclo completo de una venta con mayor detalle
export const ESTADOS_VENTA_GRANULAR = [
  'borrador',        // Venta creada, aún editable (no confirmada)
  'pendiente',       // Venta registrada, pendiente de confirmar
  'confirmada',      // Stock descontado, deuda generada si aplica
  'facturada',       // Factura AFIP emitida y autorizada
  'entregada',       // Mercadería despachada al cliente
  'cobrada',         // Pago recibido en su totalidad
  'completada',      // Todo el ciclo cerrado (confirmada + facturada + entregada + cobrada)
  'anulada'          // Cancelada (con auditoría de motivo)
] as const;

export const ESTADOS_ENTREGA = ['sin_remito', 'remito_generado', 'en_transito', 'entregado', 'devuelto'] as const;
export const ESTADOS_COBRANZA = ['sin_cobrar', 'parcialmente_cobrado', 'cobrado'] as const;
export const ESTADOS_CHEQUE = ['recibido', 'depositado', 'cobrado', 'rechazado', 'endosado'] as const;

// Momento de cobro (cuándo se cobra la venta)
export const MOMENTO_COBRO = ['anticipado', 'contra_entrega', 'diferido'] as const;

