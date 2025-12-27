export const BANCOS = ['PROVINCIA', 'SANTANDER', 'EFECTIVO', 'FCI', 'RESERVA'] as const;
export const CAJAS = BANCOS;

// Unidades de medida para productos
export const UNIDADES_MEDIDA = ['UNIDAD', 'KG', 'METRO', 'LITRO', 'CAJA', 'PAQUETE'] as const;

// MEDIOS DE PAGO - Sistema Legacy (mantener por compatibilidad con Gastos)
export const MEDIOS_PAGO_GASTOS = ['CHEQUE TERCERO', 'CHEQUE PROPIO', 'EFECTIVO', 'TRANSFERENCIA', 'TARJETA DÉBITO', 'TARJETA CRÉDITO', 'RESERVA', 'OTRO', ''] as const;

// Medios de pago para sistema de cobranza (legacy - ReciboPago)
export const MEDIOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'CUENTA_CORRIENTE'] as const;

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

// Estados de Ventas (LEGACY - mantener compatibilidad)
export const ESTADOS_VENTA = ['pendiente', 'confirmada', 'anulada', 'parcial'] as const;

// Estados de Ventas Granulares (NUEVO - Fase 2)
export const ESTADOS_VENTA_GRANULAR = [
  'borrador',        // Venta creada, aún editable
  'pendiente',       // Venta registrada, pendiente confirmar
  'confirmada',      // Stock descontado, deuda generada si aplica
  'facturada',       // Factura AFIP emitida
  'entregada',       // Mercadería despachada
  'cobrada',         // Pago recibido
  'completada',      // Ciclo cerrado
  'anulada'          // Cancelada
] as const;

// Estados de entrega para ventas y remitos
export const ESTADOS_ENTREGA = ['sin_remito', 'remito_generado', 'en_transito', 'entregado', 'devuelto'] as const;

// Estados de cobranza para ventas
export const ESTADOS_COBRANZA = ['sin_cobrar', 'parcialmente_cobrado', 'cobrado'] as const;

// Estados de cheque
export const ESTADOS_CHEQUE = ['recibido', 'depositado', 'cobrado', 'rechazado', 'endosado'] as const;

// Estados para cheques recibidos en cobranza
export const ESTADOS_CHEQUE_COBRANZA = ['pendiente', 'depositado', 'cobrado', 'rechazado', 'en_cartera'] as const;

// Momento de cobro
export const MOMENTO_COBRO = ['anticipado', 'contra_entrega', 'diferido'] as const;

// Estados de recibo de pago
export const ESTADOS_RECIBO = ['activo', 'anulado'] as const;

// Motivos de corrección de monto (para errores en cobros)
export const MOTIVOS_CORRECCION = [
  'ERROR_TIPEO',
  'DESCUENTO_NO_APLICADO',
  'RECARGO_NO_APLICADO',
  'ERROR_CALCULO',
  'OTRO'
] as const;

export const MOTIVOS_CORRECCION_LABELS: Record<typeof MOTIVOS_CORRECCION[number], string> = {
  ERROR_TIPEO: 'Error de tipeo',
  DESCUENTO_NO_APLICADO: 'Descuento no aplicado',
  RECARGO_NO_APLICADO: 'Recargo no aplicado',
  ERROR_CALCULO: 'Error de cálculo',
  OTRO: 'Otro'
};

// Interface para categorías de empleados (para mano de obra en recetas)
export interface Category {
  _id?: string;
  nombre: string;
  sueldoBasico: number;
  valorHora?: number;
  descripcion?: string;
  fechaActualizacion?: string;
}

export interface User {
  id: string;
  username: string;
  userType: 'admin' | 'oper' | 'oper_ad';
}

// Interface para obra social del empleado
export interface ObraSocial {
  nombre: string;
  numero?: string;
}

// NOTE: nested `adicionales` removed; use top-level flags `aplica*`

// Interface para empleados
export interface Employee {
  _id?: string;
  nombre: string;
  apellido: string;
  documento: string;
  puesto: string;
  fechaIngreso: string;
  sueldoBase: number;
  hora: number;
  estado: 'activo' | 'inactivo';
  modalidadContratacion?: 'formal' | 'informal'; // formal = con aportes, informal = en mano
  email?: string;
  telefono?: string;
  direccion?: string;
  fechaNacimiento?: string;
  observaciones?: string;
  categoria: string;
  antiguedad: number;
  // Flags para controlar si se deben aplicar ciertos adicionales en la liquidación
  aplicaAntiguedad?: boolean;
  aplicaPresentismo?: boolean;
  aplicaZonaPeligrosa?: boolean;
  // Campos argentinos
  cuit?: string;
  legajo?: string;
  cbu?: string;
  obraSocial?: ObraSocial;
  sindicato?: string;
  convenioId?: string;
  categoriaConvenio?: string;
}

// Tipos de descuento disponibles
export const TIPOS_DESCUENTO = {
  sancion: 'Sanción disciplinaria',
  faltante_caja: 'Faltante de caja',
  rotura: 'Rotura de mercadería/equipo',
  ausencia_injustificada: 'Ausencia injustificada',
  llegada_tarde: 'Llegadas tarde',
  mala_operacion: 'Mala operación',
  otro: 'Otro'
} as const;

export type TipoDescuento = keyof typeof TIPOS_DESCUENTO;

// Tipos de incentivo disponibles
export const TIPOS_INCENTIVO = {
  productividad: 'Premio por productividad',
  ventas: 'Bono por ventas',
  presentismo_perfecto: 'Presentismo perfecto',
  antiguedad_especial: 'Adicional por antigüedad especial',
  premio: 'Premio/Reconocimiento',
  comision: 'Comisión',
  reconocimiento: 'Reconocimiento especial',
  otro: 'Otro'
} as const;

export type TipoIncentivo = keyof typeof TIPOS_INCENTIVO;

// Interface para descuentos de empleados
export interface DescuentoEmpleado {
  _id?: string;
  empleadoId: string | { _id: string; nombre: string; apellido: string; documento: string; sueldoBase?: number };
  tipo: TipoDescuento;
  motivo: string;
  monto: number;
  esPorcentaje: boolean;
  fecha: string;
  periodoAplicacion: string; // YYYY-MM
  // Referencias y metadatos de aplicación (opcional)
  periodoId?: string;
  estado: 'pendiente' | 'aplicado' | 'anulado';
  aplicadoEnLiquidacionId?: string;
  fechaAplicacion?: string;
  aplicadoPor?: string;
  observaciones?: string;
  montoCalculado?: number; // Monto real si esPorcentaje es true
  creadoPor?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

// Interface para incentivos de empleados
export interface IncentivoEmpleado {
  _id?: string;
  empleadoId: string | { _id: string; nombre: string; apellido: string; documento: string; sueldoBase?: number };
  tipo: TipoIncentivo;
  motivo: string;
  monto: number;
  esPorcentaje: boolean;
  fecha: string;
  periodoAplicacion: string; // YYYY-MM
  // Referencias y metadatos de aplicación (opcional)
  periodoId?: string;
  estado: 'pendiente' | 'pagado' | 'anulado';
  aplicadoEnLiquidacionId?: string;
  fechaAplicacion?: string;
  aplicadoPor?: string;
  observaciones?: string;
  montoCalculado?: number; // Monto real si esPorcentaje es true
  creadoPor?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

// Interface para el cálculo de sueldos
export interface EmployeePayroll {
  employeeId: string;
  nombre: string;
  apellido: string;
  sueldoBase: number;
  antiguedadAnios: number;       // Años de antigüedad calculados desde fechaIngreso
  antiguedadTexto: string;       // Texto formateado (ej: "3 años 2m")
  adicionalAntiguedad: number;   // Monto adicional por antigüedad
  sueldoBruto: number;           // sueldoBase + adicionalAntiguedad
  modalidad: 'formal' | 'informal'; // Tipo de contratación
  totalPagado: number; // Suma de gastos con su nombre en subRubro de SUELDOS
  adelantos: number;    // Adelantos registrados (concepto = 'adelanto')
  horasExtra: number;   // Horas extra (concepto = 'hora_extra')
  sueldos: number;      // Sueldos regulares (concepto = 'sueldo')
  aguinaldos: number;   // Aguinaldos (concepto = 'aguinaldo')
  incentivos: number;        // Incentivos (concepto = 'incentivos')
  descuentos?: number;  // Descuentos aplicados
  saldoPendiente: number; // sueldoBruto - (sueldos + adelantos) + incentivos - descuentos
}

// Interface para registro de horas extras
export interface HoraExtra {
  _id?: string;
  empleadoId: string;
  empleadoNombre: string;
  empleadoApellido: string;
  fecha: string;
  cantidadHoras: number;
  valorHora: number;
  montoTotal: number;
  descripcion?: string;
  estado: 'registrada' | 'pagada' | 'cancelada';
  fechaCreacion: string;
  fechaPago?: string;
  gastoRelacionadoId?: string; // ID del gasto cuando se paga
}

// Constantes para liquidación argentina
export const APORTES_EMPLEADO = {
  JUBILACION: 11, // 11%
  OBRA_SOCIAL: 3, // 3%
  PAMI: 3, // 3% (Ley 19.032)
  SINDICATO: 2, // 2% (variable según sindicato)
} as const;

export const CONTRIBUCIONES_EMPLEADOR = {
  JUBILACION: 10.17, // 10.17%
  OBRA_SOCIAL: 6, // 6%
  PAMI: 1.5, // 1.5%
  ART: 2.5, // Variable según ART
  SEGURO_VIDA: 0.03, // 0.03%
} as const;

export const ADICIONALES_LEGALES = {
  PRESENTISMO: 8.33, // 8.33% del básico
  ANTIGUEDAD: 1, // 1% por año de antigüedad
  ZONA_DESFAVORABLE: 0, // Variable según zona
} as const;

// Interfaces para liquidación de sueldos
export interface HoraExtraResumen {
  horaExtraId: string;
  fecha: string;
  cantidadHoras: number;
  valorHora: number;
  montoTotal: number;
  descripcion?: string;
}

// Detalle de conceptos remunerativos
export interface ConceptoRemunerativo {
  codigo: string;
  descripcion: string;
  cantidad?: number;
  porcentaje?: number;
  base?: number;
  monto: number;
  tipo: 'remunerativo' | 'no_remunerativo';
}

// Detalle de retenciones/aportes
export interface RetencionAporte {
  codigo: string;
  descripcion: string;
  porcentaje: number;
  base: number;
  monto: number;
}

export interface LiquidacionEmpleado {
  empleadoId: string;
  empleadoNombre: string;
  empleadoApellido: string;
  empleadoDocumento?: string;
  empleadoCuit?: string;
  empleadoLegajo?: string;
  empleadoPuesto?: string;
  empleadoFechaIngreso?: string;
  empleadoCategoria?: string;
  empleadoObraSocial?: string;
  empleadoSindicato?: string;
  empleadoAntiguedad?: number;
  empleadoModalidad?: 'formal' | 'informal'; // formal = con aportes, informal = en mano

  // Haberes - Conceptos remunerativos
  sueldoBase: number;
  horasExtra: HoraExtraResumen[];
  totalHorasExtra: number;
  adicionalAntiguedad: number;
  adicionalPresentismo: number;
  adicionalZona: number;
  otrosAdicionales: number;
  aguinaldos: number;
  incentivos: number;
  totalRemunerativo: number;

  // Base imponible usada para cálculo de aportes y contribuciones
  baseImponible?: number;

  // Conceptos no remunerativos
  viaticos: number;
  otrosNoRemunerativos: number;
  totalNoRemunerativo: number;

  // Total de haberes (remunerativos + adicionales relevantes)
  totalHaberes: number;

  // Total bruto
  totalBruto: number;

  // Deducciones del empleado
  adelantos: number;
  descuentos: number;

  // Aportes del empleado (retenciones)
  aporteJubilacion: number;
  aporteObraSocial: number;
  aportePami: number;
  aporteSindicato: number;
  totalAportes: number;

  // Total deducciones
  totalDeducciones: number;

  // Neto a cobrar
  totalAPagar: number;

  // Contribuciones patronales (informativo)
  contribJubilacion?: number;
  contribObraSocial?: number;
  contribPami?: number;
  contribArt?: number;
  contribSeguroVida?: number;
  totalContribuciones?: number;
  costoTotal?: number; // Costo total para la empresa

  estado: 'pendiente' | 'pagado' | 'cancelado';
  gastosRelacionados: string[];
  reciboGenerado?: string;
  fechaPago?: string;
  observaciones?: string;
  medioDePago?: typeof MEDIOS_PAGO_GASTOS[number];
  banco?: typeof BANCOS[number];
  // Detalle de descuentos e incentivos
  descuentosDetalle?: DescuentoEmpleado[];
  incentivosDetalle?: IncentivoEmpleado[];
}

export interface LiquidacionPeriodo {
  _id?: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  tipo: 'quincenal' | 'mensual';
  estado: 'abierto' | 'en_revision' | 'cerrado';
  liquidaciones: LiquidacionEmpleado[];
  totalGeneral: number;
  fechaCierre?: string;
  cerradoPor?: string;
  observaciones?: string;
  createdAt?: string;
  updatedAt?: string;
}

// SubRubros mapping
export const subRubrosByRubro: Record<string, string[]> = {
  'SERVICIOS': ['ELECTRICIDAD', 'PROGRAMACION', 'AGUA', 'GAS', 'Servicios de Internet/Telecomunicaciones', 'JARDIN', 'LIMPIEZA'],
  'COBRO.VENTA': ['DEVOLUCION', 'COBRO', 'ADEUDADO', 'FLETE', 'COMISION', 'AJUSTE'],
  'PROOV.MATERIA.PRIMA': ['ALAMBRE INDUSTRIA', 'ALAMBRE RAUP', 'EMBALAJE', 'POLIESTIRENO', 'FUNDICION', 'PORTARRETRATOS', 'LLAVEROS Y PORTA'],
  'PROOVMANO.DE.OBRA': ['PORTA RETRATOS', 'SIN/FINES', 'INYECCION DE PLASTICO', 'TRIANGULOS', 'ARGOLLAS', 'GALVANO CADENAS', 'GALVANO CABEZALES', 'ARMADORAS'],
  'BANCO': ['MOVIMIENTOS AJUSTE', 'MOV.BANC', 'AJUSTE DE BANCO', 'AJUSTE CAJA', 'PRESTAMO'],
  'GASTOS.ADMIN': ['MANT.CTA', 'B.PERSONALES', 'CONVENIO MULT', 'IMP.DEB.CRED', 'HONORARIOS MARKETING', 'ARCA', 'SIRCREB'],
  'GASTOS ADMINISTRATIVOS': ['HONORARIOS', 'IMPUESTO BANCARIOS', 'IMPUESTO TARJETAS', 'VEPS', 'PLAN DE PAGO', 'MONOTRIBUTO', 'II.BB/SIRCREB', 'MANT. CTA.', 'CONSULTORIAS'],
  'ARCA': ['IVA'],
  'MANT.EMPRESA': ['GASTOS OFICINA', 'REFRIGERIO', 'BOTIQUIN', 'ELECT./PLOMERIA/PINTURA', 'INDUMENTARIA', 'PAPELERA', 'COMPUTACION', 'ARTICULOS DE LIMPIEZA', 'OTROS'],
  'MANT.MAQ': ['MECANICO', 'MATERIALES', 'TORNERO', 'MAQ. NUEVA'],
  'MOVILIDAD': ['COMBUSTIBLE', 'PEAJES', 'ESTACIONAMIENTO', 'MECANICO', 'SERVICE']
};

export interface Gasto {
  _id?: string;
  fecha: string;
  rubro: 'COBRO.VENTA' | 'SERVICIOS' | 'PROOV.MATERIA.PRIMA' | 'PROOVMANO.DE.OBRA' | 'BANCO' | 'ARCA' | 'GASTOS.ADMIN' | 'GASTOS ADMINISTRATIVOS' | 'MANT.MAQ' | 'MANT.EMPRESA' | 'SUELDOS' | 'MOVILIDAD';
  subRubro: string;
  // Allow empty string as a valid initial value for Select components
  medioDePago: typeof MEDIOS_PAGO_GASTOS[number];
  clientes: string;
  detalleGastos: string;
  tipoOperacion: 'entrada' | 'salida' | 'transferencia';
  concepto?: 'sueldo' | 'adelanto' | 'hora_extra' | 'aguinaldo' | 'incentivos' | 'otro';
  comentario: string;
  fechaStandBy?: string;
  estado?: 'activo' | 'cancelado';
  confirmado?: boolean; // Para cheques: false = pendiente, true = confirmado/cobrado
  // Nuevos campos para manejo de cheques de terceros
  numeroCheque?: string;
  estadoCheque?: 'recibido' | 'depositado' | 'pagado_proveedor' | 'endosado';
  chequeRelacionadoId?: string;
  entrada?: number;
  salida?: number;
  // Campos específicos para transferencias
  cuentaOrigen?: typeof BANCOS[number];
  cuentaDestino?: typeof BANCOS[number];
  montoTransferencia?: number;
  banco: typeof BANCOS[number];
  // Campo para bloqueo de edición (vinculado a recibo)
  reciboRelacionadoId?: string;
}

// ========== SISTEMA DE VENTAS E INVENTARIO ==========

// Interface para productos
export interface Producto {
  _id?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  unidadMedida: typeof UNIDADES_MEDIDA[number];
  proveedor?: string;
  imagen?: string;
  estado: 'activo' | 'inactivo';
  fechaCreacion?: string;
  fechaActualizacion?: string;
  // Virtuals (calculados por el backend)
  stockBajo?: boolean;
  margenGanancia?: number;
}

// Interface para clientes
export interface Cliente {
  _id?: string;
  tipoDocumento: 'DNI' | 'CUIT' | 'CUIL' | 'Pasaporte';
  numeroDocumento: string;
  razonSocial?: string;
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  telefonoAlt?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  codigoPostal?: string;
  condicionIVA: 'Responsable Inscripto' | 'Monotributista' | 'Exento' | 'Consumidor Final';
  saldoCuenta: number;
  limiteCredito: number;
  estado: 'activo' | 'inactivo' | 'moroso';
  observaciones?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  ultimaCompra?: string;
  // Virtuals (calculados por el backend)
  nombreCompleto?: string;
  puedeComprarCredito?: boolean;

  // Campos para facturación fiscal
  requiereFacturaAFIP: boolean;
  aplicaIVA: boolean;
  facturacionAutomatica?: boolean; // Generar factura automáticamente al cobrar (Fase 2)

  // Campos para entregas
  direccionEntrega?: string;
  direccionesAlternativas?: Array<{
    alias: string;
    direccion: string;
    ciudad?: string;
    referencia?: string;
    contacto?: string;
    telefono?: string;
  }>;

  // Preferencias de pago
  aceptaCheques: boolean;
  diasVencimientoCheques?: number;

  // Notas e incidentes
  notas?: Array<{
    _id?: string;
    texto: string;
    tipo: 'incidente' | 'problema' | 'observacion' | 'seguimiento';
    creadoPor: string;
    fechaCreacion: string;
  }>;
}

// Interface para item de venta
export interface ItemVenta {
  productoId: string;
  codigoProducto: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  descuento: number;
  total: number;
  porcentajeDescuento?: number; // Porcentaje de descuento aplicado (0-100)
}

// Interface para venta
export interface Venta {
  _id?: string;
  numeroVenta?: string;
  fecha: string;
  clienteId: string;
  nombreCliente: string;
  creadoPor: string;
  documentoCliente: string;
  items: ItemVenta[];
  subtotal: number;
  descuentoTotal: number;
  iva: number;
  total: number;
  medioPago: typeof MEDIOS_PAGO_GASTOS[number];
  momentoCobro: typeof MOMENTO_COBRO[number]; // Cuándo se cobra: anticipado, contra_entrega, diferido
  detallesPago?: string;
  banco?: typeof BANCOS[number];
  estado: typeof ESTADOS_VENTA[number]; // Estado legacy
  estadoGranular?: typeof ESTADOS_VENTA_GRANULAR[number]; // Estado detallado (Fase 2)
  observaciones?: string;
  vendedor: string;
  gastoRelacionadoId?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  fechaAnulacion?: string;
  motivoAnulacion?: string;
  usuarioAnulacion?: string;
  usuarioConfirmacion?: string;

  // Campos fiscales
  aplicaIVA: boolean;
  requiereFacturaAFIP: boolean;

  // Campos para cheques
  datosCheque?: {
    numeroCheque: string;
    bancoEmisor: string;
    cuitTitular?: string;
    titularCheque?: string;
    fechaEmision: string;
    fechaVencimiento: string;
    monto: number;
    estadoCheque: typeof ESTADOS_CHEQUE[number];
    fechaDeposito?: string;
    observaciones?: string;
  };

  // Campos para remito y entrega
  estadoEntrega: typeof ESTADOS_ENTREGA[number];
  remitoId?: string;
  direccionEntrega?: string;
  fechaEntrega?: string;

  // Campos para cobranza
  estadoCobranza: typeof ESTADOS_COBRANZA[number];
  montoCobrado: number;
  saldoPendiente: number;
  recibosRelacionados?: string[];
  ultimaCobranza?: string;

  // Campos para facturación
  facturaId?: string;
  facturada?: boolean;
}

// Interface para estadísticas de ventas
export interface EstadisticasVentas {
  totalVentas: number;
  montoTotal: number;
  montoPromedio: number;
  ventasPorEstado: Array<{
    _id: string;
    cantidad: number;
    total: number;
  }>;
  ventasPorMedioPago: Array<{
    _id: string;
    cantidad: number;
    total: number;
  }>;
}

// Interface para métricas de producto individual
export interface MetricaProducto {
  _id: string;
  codigoProducto: string;
  nombreProducto: string;
  categoria: string;

  // Métricas de cantidad
  unidadesVendidas: number;
  numeroVentas: number;

  // Métricas de montos
  totalVendido: number;
  totalNetoSinIVA: number;
  totalDescuentos: number;

  // Precios
  precioPromedioVenta: number;
  precioVentaActual: number;
  precioCompraActual: number;
  ticketPromedio: number;

  // Márgenes
  margenBrutoUnitario: number;
  porcentajeMargenBruto: number;
  utilidadNetaEstimada: number;
  porcentajeUtilidadNeta: number;

  // Costos
  costoTotalEstimado: number;

  // Stock
  stockActual: number;

  // Ranking y clasificación
  ranking: number;
  participacionVentas: number;
  clasificacionABC: 'A' | 'B' | 'C';
}

// Interface para totales de estadísticas de productos
export interface TotalesEstadisticasProductos {
  totalUnidadesVendidas: number;
  totalMontoVendido: number;
  totalUtilidadEstimada: number;
  totalDescuentos: number;
  totalProductos: number;
  margenPromedioGeneral: number;
}

// Interface para filtros de estadísticas de productos
export interface FiltrosEstadisticasProductos {
  fechaInicio: string;
  fechaFin: string;
  categoria: string;
  limit: string;
}

// Interface para respuesta completa de estadísticas de productos
export interface EstadisticasProductos {
  productos: MetricaProducto[];
  totales: TotalesEstadisticasProductos;
  filtros: FiltrosEstadisticasProductos;
}

// ========== SISTEMA DE REMITOS ==========

// Estados de remito
export const ESTADOS_REMITO = ['pendiente', 'en_transito', 'entregado', 'devuelto', 'cancelado'] as const;

// Interface para items de remito
export interface ItemRemito {
  productoId: string;
  codigoProducto: string;
  nombreProducto: string;
  cantidadSolicitada: number;
  cantidadEntregada: number;
  observacion?: string;
}

// Interface para remito
export interface Remito {
  _id?: string;
  numeroRemito: string;
  fecha: string;
  ventaId: string;
  clienteId: string | Cliente; // Puede ser string o Cliente populado
  nombreCliente: string;
  documentoCliente: string;
  direccionEntrega: string;
  items: ItemRemito[];
  estado: typeof ESTADOS_REMITO[number];
  repartidor?: string;
  numeroBultos?: string;
  medioEnvio?: string;
  horaDespacho?: string;
  horaEntrega?: string;
  nombreReceptor?: string;
  dniReceptor?: string;
  firmaDigital?: string;
  observaciones?: string;
  motivoCancelacion?: string;
  creadoPor: string;
  modificadoPor?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Interface para estadísticas de remitos
export interface EstadisticasRemitos {
  pendiente: number;
  en_transito: number;
  entregado: number;
  devueltos: number;
  cancelados: number;
  total: number;
}

// ========== SISTEMA DE COMPRAS E INVENTARIO DE MATERIAS PRIMAS ==========

// Interface para proveedores
export interface Proveedor {
  _id?: string;
  tipoProveedor: 'MATERIA_PRIMA' | 'PROOVMANO.DE.OBRA';
  tipoDocumento: 'DNI' | 'CUIT' | 'CUIL' | 'Pasaporte';
  numeroDocumento: string;
  razonSocial: string;
  nombreContacto?: string;
  email?: string;
  telefono?: string;
  telefonoAlt?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  codigoPostal?: string;
  condicionIVA: 'Responsable Inscripto' | 'Monotributista' | 'Exento' | 'Consumidor Final';
  saldoCuenta: number; // Positivo = debemos, negativo = anticipo
  limiteCredito: number;
  categorias: string[];
  diasPago?: number;
  estado: 'activo' | 'inactivo' | 'bloqueado';
  calificacion?: number;
  observaciones?: string;
  banco?: string;
  cbu?: string;
  alias?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  ultimaCompra?: string;
  // Notas e incidentes
  notas?: Array<{
    _id?: string;
    texto: string;
    tipo: 'incidente' | 'problema' | 'observacion' | 'seguimiento';
    creadoPor: string;
    fechaCreacion: string;
  }>;
  // Virtuals
  tieneSaldoPendiente?: boolean;
  puedeComprarCredito?: boolean;
}

// Interface para materia prima
export interface MateriaPrima {
  _id?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  precioUltimaCompra: number;
  precioPromedio: number;
  stock: number;
  stockMinimo: number;
  stockMaximo: number;
  unidadMedida: typeof UNIDADES_MEDIDA[number];
  proveedorPrincipal?: string | Proveedor;
  proveedoresAlternativos?: string[] | Proveedor[];
  ubicacion?: string;
  lote?: string;
  fechaVencimiento?: string;
  estado: 'activo' | 'inactivo' | 'discontinuado';
  observaciones?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  ultimaCompra?: string;
  // Virtuals
  stockBajo?: boolean;
  stockCritico?: boolean;
  estaVencido?: boolean;
  proximoVencer?: boolean;
}

// Interface para item de compra
export interface ItemCompra {
  materiaPrimaId: string;
  codigoMateriaPrima: string;
  nombreMateriaPrima: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  descuento: number;
  total: number;
}

// Interface para compra
export interface Compra {
  _id?: string;
  numeroCompra?: string;
  fecha: string;
  fechaEntrega?: string;
  fechaRecepcion?: string;
  proveedorId: string;
  razonSocialProveedor: string;
  documentoProveedor: string;
  items: ItemCompra[];
  subtotal: number;
  descuentoTotal: number;
  iva: number;
  total: number;
  medioPago?: typeof MEDIOS_PAGO_GASTOS[number];
  banco?: typeof BANCOS[number];
  detallesPago?: string;
  estado: 'presupuesto' | 'pedido' | 'parcial' | 'recibido' | 'pagado' | 'anulado';
  tipoComprobante?: 'Factura A' | 'Factura B' | 'Factura C' | 'Remito' | 'Presupuesto';
  numeroComprobante?: string;
  observaciones?: string;
  comprador: string;
  gastoRelacionadoId?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  fechaAnulacion?: string;
  motivoAnulacion?: string;
}

// Interface para estadísticas de compras
export interface EstadisticasCompras {
  totalCompras: number;
  montoTotal: number;
  porEstado: Array<{
    _id: string;
    cantidad: number;
    totalMonto: number;
  }>;
}

// Interface para movimiento de inventario
export interface MovimientoInventario {
  _id?: string;
  fecha: string;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'produccion' | 'devolucion' | 'merma';
  materiaPrimaId: string;
  codigoMateriaPrima?: string;
  nombreMateriaPrima?: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  precioUnitario?: number;
  valor?: number;
  documentoOrigen?: 'compra' | 'venta' | 'produccion' | 'ajuste' | 'devolucion';
  documentoOrigenId?: string;
  numeroDocumento?: string;
  observaciones?: string;
  responsable?: string;
  fechaCreacion?: string;
}

// Interface para estadísticas de movimientos
export interface EstadisticasMovimientos {
  totalMovimientos: number;
  porTipo: Array<{
    _id: string;
    cantidad: number;
    totalCantidad: number;
  }>;
}

// ========== MÓDULO DE PRODUCCIÓN ==========

// Interface para item de materia prima en receta
export interface ItemReceta {
  materiaPrimaId: string;
  codigoMateriaPrima: string;
  nombreMateriaPrima: string;
  cantidad: number;
  unidadMedida: string;
  costo?: number;
}

// Interface para item de mano de obra en receta (operarios por categoría)
export interface ItemManoObra {
  categoriaId: string;
  nombreCategoria: string;
  cantidadOperarios: number;  // Cantidad de operarios de esta categoría
  horasPorOperario: number;   // Horas que trabaja cada operario
  valorHora: number;          // Valor hora de la categoría
  costoTotal?: number;        // Calculado: cantidadOperarios * horasPorOperario * valorHora
}

// Interface para receta (BOM)
export interface Receta {
  _id?: string;
  productoId: string;
  codigoProducto: string;
  nombreProducto: string;
  materiasPrimas: ItemReceta[];
  manoObra?: ItemManoObra[];  // Array de operarios por categoría
  rendimiento: number;
  tiempoPreparacion: number;
  costoMateriasPrimas: number;
  costoManoObra?: number;     // Calculado desde manoObra[]
  costoIndirecto?: number;
  costoTotal: number;
  costoUnitario?: number;
  precioVentaSugerido?: number;
  margenBruto?: number;
  estado: 'activa' | 'inactiva' | 'borrador';
  version: number;
  observaciones?: string;
  createdBy: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  esRentable?: boolean;
  necesitaActualizacion?: boolean;
}

// Interface para simulación de producción
export interface SimulacionProduccion {
  receta: {
    id: string;
    producto: string;
    version: number;
  };
  cantidadSolicitada: number;
  unidadesProducidas: number;
  factible: boolean;
  materiasPrimas: Array<{
    materiaPrimaId: string;
    codigo: string;
    nombre: string;
    cantidadNecesaria: number;
    stockDisponible: number;
    disponible: boolean;
    faltante: number;
    costo: number;
  }>;
  costos: {
    materiasPrimas: number;
    manoObra: number;
    indirecto: number;
    total: number;
    unitario: number;
  };
  tiempoEstimado: number;
  alertas: string[];
}

// Interface para materia prima en orden de producción
export interface MateriaPrimaOrden {
  materiaPrimaId: string;
  codigoMateriaPrima: string;
  nombreMateriaPrima: string;
  cantidadNecesaria: number;
  cantidadReservada: number;
  cantidadConsumida: number;
  costo: number;
}

// Interface para orden de producción
export interface OrdenProduccion {
  _id?: string;
  numeroOrden?: string;
  fecha: string;
  fechaInicio?: string;
  fechaFinalizacion?: string;
  recetaId: string;
  productoId: string;
  codigoProducto: string;
  nombreProducto: string;
  cantidadAProducir: number;
  unidadesProducidas: number;
  materiasPrimas: MateriaPrimaOrden[];
  costoMateriasPrimas: number;
  costoManoObra: number;
  costoIndirecto: number;
  costoTotal: number;
  costoUnitario?: number;
  estado: 'planificada' | 'en_proceso' | 'completada' | 'cancelada';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  responsable: string;
  observaciones?: string;
  motivoCancelacion?: string;
  createdBy: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  progreso?: {
    totalNecesario: number;
    totalReservado: number;
    totalConsumido: number;
    porcentajeReserva: number;
    porcentajeConsumo: number;
  };
  tiempoProduccion?: number;
}

// Interface para estadísticas de producción
export interface EstadisticasProduccion {
  totalOrdenes: number;
  ordenesPorEstado: Array<{
    _id: string;
    cantidad: number;
    unidadesProducidas: number;
    costoTotal: number;
  }>;
  productosMasProducidos: Array<{
    _id: string;
    codigoProducto: string;
    nombreProducto: string;
    totalOrdenes: number;
    unidadesProducidas: number;
    costoTotal: number;
  }>;
  costoTotalProduccion: number;
}

// ========== SISTEMA DE COBRANZA Y RECIBOS DE PAGO ==========

// Interface para datos de cheque recibido
export interface DatosCheque {
  numeroCheque: string;
  bancoEmisor: string;
  fechaEmision: string;
  fechaVencimiento: string;
  titularCheque: string;
  cuitTitular?: string;
  estadoCheque: typeof ESTADOS_CHEQUE_COBRANZA[number];
  observaciones?: string;
  fechaDeposito?: string;
  fechaCobro?: string;
  fechaRechazo?: string;
  motivoRechazo?: string;
}

// Interface para datos de transferencia
export interface DatosTransferencia {
  numeroOperacion: string; // Número de transacción/orden bancaria
  fechaTransferencia: string;
  cuentaOrigen?: string;
  cuentaDestino?: string;
  observaciones?: string;
  // NOTA: El banco destino va en FormaPago.banco (la caja donde impacta)
}

// Interface para datos de tarjeta
export interface DatosTarjeta {
  tipoTarjeta: 'debito' | 'credito';
  numeroAutorizacion?: string;
  lote?: string;
  cuotas?: number;
  marca?: 'VISA' | 'MASTERCARD' | 'AMEX' | 'CABAL' | 'NARANJA';
  ultimos4Digitos?: string;
  observaciones?: string;
}

// Interface para forma de pago individual
export interface FormaPago {
  medioPago: typeof MEDIOS_PAGO[number];
  monto: number;
  banco?: typeof BANCOS[number];

  // Datos específicos según medio de pago
  datosCheque?: DatosCheque;
  datosTransferencia?: DatosTransferencia;
  datosTarjeta?: DatosTarjeta;

  observaciones?: string;
}

// Interface para venta relacionada en recibo
export interface VentaRelacionada {
  ventaId: string;
  numeroVenta: string;
  montoOriginal: number;
  saldoAnterior: number;
  montoCobrado: number;
  saldoRestante: number;
}

// Interface para recibo de pago
export interface ReciboPago {
  _id?: string;
  numeroRecibo: string;
  fecha: string;
  clienteId: string;
  nombreCliente: string;
  documentoCliente: string;

  // Comprobantes relacionados (ventas cobradas)
  ventasRelacionadas: VentaRelacionada[];

  // Formas de pago utilizadas
  formasPago: FormaPago[];

  // Totales
  totales: {
    totalACobrar: number;      // Suma de saldos pendientes de ventas
    totalCobrado: number;       // Suma de formas de pago
    vuelto: number;             // Si totalCobrado > totalACobrar
    saldoPendiente: number;     // Si totalCobrado < totalACobrar (no debería pasar)
  };

  // Metadata
  momentoCobro: typeof MOMENTO_COBRO[number];
  estadoRecibo: typeof ESTADOS_RECIBO[number];
  observaciones?: string;
  motivoAnulacion?: string;
  fechaAnulacion?: string;

  creadoPor: string;
  modificadoPor?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Interface para estadísticas de cobranza
export interface EstadisticasCobranza {
  totalRecibos: number;
  montoTotalCobrado: number;
  recibosPorMedioPago: Array<{
    medioPago: string;
    cantidad: number;
    monto: number;
  }>;
  ventasPendientesCobro: {
    cantidad: number;
    montoTotal: number;
  };
  chequesPendientes: {
    cantidad: number;
    montoTotal: number;
  };
}

// ========== SISTEMA DE CUENTA CORRIENTE ==========

// Interface para movimientos de cuenta corriente
export interface MovimientoCuentaCorriente {
  _id?: string;
  clienteId: string;
  fecha: string;
  tipo: 'venta' | 'recibo' | 'nota_credito' | 'nota_debito' | 'ajuste_cargo' | 'ajuste_descuento';
  documentoTipo: string;
  documentoNumero: string;
  documentoId?: string;
  concepto: string;
  observaciones?: string;
  debe: number;
  haber: number;
  saldo: number;
  creadoPor?: string;
  anulado: boolean;
  fechaAnulacion?: string;
  motivoAnulacion?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Interface para resumen de cuenta corriente
export interface ResumenCuentaCorriente {
  clienteId: string;
  nombreCliente: string;
  limiteCredito: number;
  saldoActual: number;
  saldoDisponible: number;
  totalDebe: number;
  totalHaber: number;
  estadoCuenta: 'al_dia' | 'proximo_limite' | 'limite_excedido' | 'moroso';
  porcentajeUso: number;
  movimientosPorTipo: Array<{
    _id: string;
    cantidad: number;
    monto: number;
  }>;
  fechaUltimoMovimiento: string | null;
}

// Interface para antigüedad de deuda
export interface AntiguedadDeuda {
  clienteId: string;
  nombreCliente: string;
  total: number;
  antiguedad: {
    corriente: {
      monto: number;
      cantidad: number;
      items: Array<{
        documentoNumero: string;
        fecha: string;
        diasVencidos: number;
        monto: number;
      }>;
    };
    treintaDias: {
      monto: number;
      cantidad: number;
      items: Array<{
        documentoNumero: string;
        fecha: string;
        diasVencidos: number;
        monto: number;
      }>;
    };
    sesentaDias: {
      monto: number;
      cantidad: number;
      items: Array<{
        documentoNumero: string;
        fecha: string;
        diasVencidos: number;
        monto: number;
      }>;
    };
    noventaDias: {
      monto: number;
      cantidad: number;
      items: Array<{
        documentoNumero: string;
        fecha: string;
        diasVencidos: number;
        monto: number;
      }>;
    };
  };
  alerta: string | null;
}

// ========== INTERESES PUNITORIOS ==========

// Estados de interés punitorio
export const ESTADOS_INTERES = ['devengando', 'cobrado_parcial', 'cobrado_total', 'condonado_parcial', 'condonado_total'] as const;

// Tipos de acción sobre intereses
export const TIPOS_ACCION_INTERES = ['calculo', 'cobro', 'condonacion'] as const;

// Interface para configuración de tasa de interés
export interface ConfiguracionIntereses {
  _id?: string;
  tasaMensualVigente: number;
  fechaVigenciaDesde: string;
  fechaVigenciaHasta?: string;
  aplicaDesde: number; // Días de mora antes de aplicar interés (ej: 31)
  fuenteReferencia: string; // Ej: "Banco Nación - Res. 2024/01"
  observaciones?: string;
  creadoPor: string;
  createdAt?: string;
  updatedAt?: string;
  tasaDiariaCalculada?: number; // Virtual: tasaMensual / 30
}

// Interface para documento relacionado al interés
export interface DocumentoRelacionado {
  tipo: 'venta' | 'recibo' | 'nota_debito' | 'otro';
  documentoId: string;
  numeroDocumento: string;
  fecha?: string;
}

// Interface para acción sobre interés (audit trail)
export interface AccionInteres {
  fecha: string;
  tipo: typeof TIPOS_ACCION_INTERES[number];
  monto: number;
  usuario: string;
  observaciones?: string;
  notaDebitoId?: string; // ID del MovimientoCuentaCorriente generado
}

// Interface principal de interés punitorio
export interface InteresPunitorio {
  _id?: string;
  clienteId: string | {
    _id: string;
    nombre?: string;
    apellido?: string;
    razonSocial?: string;
    numeroDocumento?: string;
  };
  documentoRelacionado: DocumentoRelacionado;

  // Montos originales
  capitalOriginal: number;

  // Fechas relevantes
  fechaVencimiento: string;
  fechaInicioPunitorio: string; // Vencimiento + aplicaDesde días
  fechaFinCalculo: string; // Última fecha hasta la que se calculó

  // Tasas aplicadas
  tasaInteresMensual: number;
  tasaDiariaAplicada: number;

  // Tiempo transcurrido
  diasTranscurridos: number;

  // Montos de interés
  interesDevengado: number; // Total calculado
  interesCobrado: number; // Ya cobrado (vía Nota Débito)
  interesCondonado: number; // Perdonado
  interesPendiente: number; // Devengado - Cobrado - Condonado

  // Estado
  estado: typeof ESTADOS_INTERES[number];

  // Auditoría de acciones
  acciones: AccionInteres[];

  createdAt?: string;
  updatedAt?: string;
}

// Interface para estadísticas de intereses
export interface EstadisticasIntereses {
  totalRegistros: number;
  totalDevengado: number;
  totalCobrado: number;
  totalCondonado: number;
  totalPendiente: number;
  porEstado: {
    devengando: number;
    cobradoParcial: number;
    cobradoTotal: number;
    condonadoParcial: number;
    condonadoTotal: number;
  };
  diasPromedio: number;
}