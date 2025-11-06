// Bancos disponibles
export const BANCOS = ['PROVINCIA', 'SANTANDER', 'EFECTIVO', 'FCI', 'RESERVA'] as const;

// Unidades de medida para productos
export const UNIDADES_MEDIDA = ['UNIDAD', 'KG', 'METRO', 'LITRO', 'CAJA', 'PAQUETE'] as const;

export const MEDIOS_PAGO_GASTOS = ['CHEQUE TERCERO', 'CHEQUE PROPIO', 'EFECTIVO', 'TRANSFERENCIA', 'TARJETA DÉBITO', 'TARJETA CRÉDITO', 'RESERVA', 'OTRO', ''] as const;

// Medios de pago para sistema de cobranza (más específico)
export const MEDIOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'CUENTA_CORRIENTE'] as const;

// Estados de Ventas
export const ESTADOS_VENTA = ['pendiente', 'confirmada', 'anulada', 'parcial'] as const;

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
export interface User {
  id: string;
  username: string;
  userType: 'admin' | 'oper' | 'oper_ad';
}

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
  email?: string;
  telefono?: string;
  observaciones?: string;
}

// Interface para el cálculo de sueldos
export interface EmployeePayroll {
  employeeId: string;
  nombre: string;
  apellido: string;
  sueldoBase: number;
  totalPagado: number; // Suma de gastos con su nombre en subRubro de SUELDOS
  adelantos: number;    // Adelantos registrados (concepto = 'adelanto')
  horasExtra: number;   // Horas extra (concepto = 'hora_extra')
  sueldos: number;      // Sueldos regulares (concepto = 'sueldo')
  aguinaldos: number;   // Aguinaldos (concepto = 'aguinaldo')
  bonus: number;        // Bonus (concepto = 'bonus')
  saldoPendiente: number; // sueldoBase - (sueldos + adelantos) - Los pagos extra (horas extra, aguinaldos, bonus) no afectan el sueldo base
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

// Interfaces para liquidación de sueldos
export interface HoraExtraResumen {
  horaExtraId: string;
  fecha: string;
  cantidadHoras: number;
  valorHora: number;
  montoTotal: number;
  descripcion?: string;
}

export interface LiquidacionEmpleado {
  empleadoId: string;
  empleadoNombre: string;
  empleadoApellido: string;
  sueldoBase: number;
  horasExtra: HoraExtraResumen[];
  totalHorasExtra: number;
  adelantos: number;
  aguinaldos: number;
  bonus: number;
  descuentos: number;
  totalAPagar: number;
  estado: 'pendiente' | 'pagado' | 'cancelado';
  gastosRelacionados: string[];
  reciboGenerado?: string;
  fechaPago?: string;
  observaciones?: string;
  medioDePago?: typeof MEDIOS_PAGO_GASTOS[number];
  banco?: typeof BANCOS[number];
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
  'SERVICIOS': ['ELECTRICIDAD', 'PROGRAMACION', 'AGUA', 'GAS', 'Servicios de Internet/Telecomunicaciones', 'JARDIN','LIMPIEZA'],
  'COBRO.VENTA': ['DEVOLUCION', 'COBRO', 'ADEUDADO', 'FLETE', 'COMISION', 'AJUSTE'],
  'PROOV.MATERIA.PRIMA': ['ALAMBRE INDUSTRIA', 'ALAMBRE RAUP', 'EMBALAJE', 'POLIESTIRENO', 'FUNDICION', 'PORTARRETRATOS', 'LLAVEROS Y PORTA'],
  'PROOVMANO.DE.OBRA': ['PORTA RETRATOS', 'SIN/FINES', 'INYECCION DE PLASTICO', 'TRIANGULOS', 'ARGOLLAS', 'GALVANO CADENAS', 'GALVANO CABEZALES', 'ARMADORAS'],
  'BANCO': ['MOVIMIENTOS AJUSTE', 'MOV.BANC', 'AJUSTE DE BANCO','AJUSTE CAJA','PRESTAMO'],
  'GASTOS.ADMIN': ['MANT.CTA', 'B.PERSONALES', 'CONVENIO MULT','IMP.DEB.CRED','HONORARIOS MARKETING','ARCA','SIRCREB'],
  'GASTOS ADMINISTRATIVOS': ['HONORARIOS', 'IMPUESTO BANCARIOS', 'IMPUESTO TARJETAS', 'VEPS', 'PLAN DE PAGO', 'MONOTRIBUTO', 'II.BB/SIRCREB', 'MANT. CTA.', 'CONSULTORIAS'],
  'ARCA': ['IVA'],
  'MANT.MAQ': ['MECANICO', 'MATERIALES', 'TORNERO','MAQ. NUEVA'],
  'MOVILIDAD': ['COMBUSTIBLE', 'PEAJES', 'ESTACIONAMIENTO','MECANICO','SERVICE']
};

export interface Gasto {
  _id?: string;
  fecha: string;
  rubro: 'COBRO.VENTA' | 'SERVICIOS' | 'PROOV.MATERIA.PRIMA' | 'PROOVMANO.DE.OBRA' | 'BANCO' | 'ARCA' | 'GASTOS.ADMIN' | 'GASTOS ADMINISTRATIVOS' | 'MANT.MAQ' | 'SUELDOS' | 'MOVILIDAD';
  subRubro: string;
  // Allow empty string as a valid initial value for Select components
  medioDePago: typeof MEDIOS_PAGO_GASTOS[number];
  clientes: string;
  detalleGastos: string;
  tipoOperacion: 'entrada' | 'salida' | 'transferencia';
  concepto?: 'sueldo' | 'adelanto' | 'hora_extra' | 'aguinaldo' | 'bonus' | 'otro';
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
  detallesPago?: string;
  banco?: typeof BANCOS[number];
  estado: typeof ESTADOS_VENTA[number];
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
  clienteId: string;
  nombreCliente: string;
  documentoCliente: string;
  direccionEntrega: string;
  items: ItemRemito[];
  estado: typeof ESTADOS_REMITO[number];
  repartidor?: string;
  vehiculo?: string;
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
  tipoDocumento: 'DNI' | 'CUIT' | 'CUIL' | 'Pasaporte';
  numeroDocumento: string;
  razonSocial: string;
  nombreContacto?: string;
  email?: string;
  telefono?: string;
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

// Interface para receta (BOM)
export interface Receta {
  _id?: string;
  productoId: string;
  codigoProducto: string;
  nombreProducto: string;
  materiasPrimas: ItemReceta[];
  rendimiento: number;
  tiempoPreparacion: number;
  costoMateriasPrimas: number;
  costoManoObra?: number;
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