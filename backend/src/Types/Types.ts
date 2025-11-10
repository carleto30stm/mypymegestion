
// Define valid subRubros for each rubro
export const subRubrosByRubro: Record<string, string[]> = {
  'SERVICIOS': ['ELECTRICIDAD', 'PROGRAMACION', 'AGUA', 'GAS', 'Servicios de Internet/Telecomunicaciones', 'JARDIN','LIMPIEZA'],
  'COBRO.VENTA': ['DEVOLUCION', 'COBRO', 'ADEUDADO', 'FLETE', 'COMISION', 'AJUSTE',],
  'PROOV.MATERIA.PRIMA': ['ALAMBRE INDUSTRIA', 'ALAMBRE RAUP', 'EMBALAJE', 'POLIESTIRENO', 'FUNDICION', 'PORTARRETRATOS', 'LLAVEROS Y PORTA', 'COMPRA DE MATERIAS PRIMAS' ],
  'PROOVMANO.DE.OBRA': ['PORTA RETRATOS', 'SIN/FINES', 'INYECCION DE PLASTICO', 'TRIANGULOS', 'ARGOLLAS', 'GALVANO CADENAS', 'GALVANO CABEZALES', 'ARMADORAS'],
  'BANCO': ['MOVIMIENTOS AJUSTE', 'MOV.BANC', 'AJUSTE DE BANCO','AJUSTE CAJA','PRESTAMO','INTERES'],
  'ARCA': ['IVA'],
  'GASTOS ADMINISTRATIVOS': ['HONORARIOS', 'IMPUESTO BANCARIOS', 'IMPUESTO TARJETAS', 'VEPS', 'PLAN DE PAGO', 'MONOTRIBUTO', 'II.BB/SIRCREB', 'MANT. CTA.', 'CONSULTORIAS'],
  'MANT.EMPRESA': ['GASTOS OFICINA', 'REFRIGERIO', 'BOTIQUIN','ELECT./PLOMERIA/PINTURA','INDUMENTARIA','PAPELERA','COMPUTACION','ARTICULOS DE LIMPIEZA','OTROS'],
  'MANT.MAQ': ['MECANICO', 'MATERIALES', 'TORNERO','MAQ. NUEVA'],
  'MOVILIDAD': ['COMBUSTIBLE', 'PEAJES', 'ESTACIONAMIENTO','MECANICO','SERVICE']
};

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

// Bancos disponibles
export const CAJAS = ['PROVINCIA', 'SANTANDER', 'EFECTIVO', 'FCI', 'RESERVA'] as const;

export const UNIDADES_MEDIDA = ['UNIDAD', 'KG', 'LITRO', 'METRO', 'CAJA', 'PAQUETE'] as const;

// Estados de Ventas
export const ESTADOS_VENTA = ['pendiente', 'confirmada', 'anulada', 'parcial'] as const;
export const ESTADOS_ENTREGA = ['sin_remito', 'remito_generado', 'en_transito', 'entregado', 'devuelto'] as const;
export const ESTADOS_COBRANZA = ['sin_cobrar', 'parcialmente_cobrado', 'cobrado'] as const;
export const ESTADOS_CHEQUE = ['recibido', 'depositado', 'cobrado', 'rechazado', 'endosado'] as const;

