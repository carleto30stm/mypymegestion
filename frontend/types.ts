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
  medioDePago?: '' | 'Cheque Tercero' | 'Cheque Propio' | 'Efectivo' | 'Transferencia' | 'Tarjeta Débito' | 'Tarjeta Crédito' | 'Reserva' | 'Otro';
  banco?: 'PROVINCIA' | 'SANTANDER' | 'EFECTIVO' | 'FCI' | 'RESERVA';
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
  'BANCO': ['MOVIMIENTOS AJUSTE', 'MOV.BANC', 'AJUSTE DE BANCO','AJUSTE CAJA'],
  'GASTOS.ADMIN': ['MANT.CTA', 'B.PERSONALES', 'CONVENIO MULT','IMP.DEB.CRED','HONORARIOS MARKETING','ARCA','SIRCREB'],
  'GASTOS ADMINISTRATIVOS': ['HONORARIOS', 'IMPUESTO BANCARIOS', 'IMPUESTO TARJETAS', 'VEPS', 'PLAN DE PAGO', 'MONOTRIBUTO', 'II.BB/SIRCREB', 'MANT. CTA.', 'CONSULTORIAS'],
  'ARCA': ['IVA'],
  'MANT.MAQ': ['MECANICO', 'MATERIALES', 'TORNERO','MAQ. NUEVA'],
  'MOVILIDAD': ['COMBUSTIBLE', 'PEAJES', 'ESTACIONAMIENTO','MECANICO','SERVICE']
};

// Bancos disponibles
export const BANCOS = ['PROVINCIA', 'SANTANDER', 'EFECTIVO', 'FCI', 'RESERVA'] as const;

// Unidades de medida para productos
export const UNIDADES_MEDIDA = ['unidad', 'Kilo', 'Metro', 'Litro', 'Caja', 'Paquete'] as const;

// Medios de pago para ventas
export const MEDIOS_PAGO_VENTAS = ['Efectivo', 'Transferencia', 'Tarjeta Débito', 'Tarjeta Crédito', 'Cheque Tercero', 'Cuenta Corriente', 'Mixto'] as const;

export interface Gasto {
  _id?: string;
  fecha: string;
  rubro: 'COBRO.VENTA' | 'SERVICIOS' | 'PROOV.MATERIA.PRIMA' | 'PROOVMANO.DE.OBRA' | 'BANCO' | 'ARCA' | 'GASTOS.ADMIN' | 'GASTOS ADMINISTRATIVOS' | 'MANT.MAQ' | 'SUELDOS' | 'MOVILIDAD';
  subRubro: string;
  // Allow empty string as a valid initial value for Select components
  medioDePago: '' | 'Cheque Tercero' | 'Cheque Propio' | 'Efectivo' | 'Transferencia'| 'Tarjeta Débito' | 'Tarjeta Crédito' | 'Reserva' | 'Otro';
  clientes: string;
  detalleGastos: string;
  tipoOperacion: 'entrada' | 'salida' | 'transferencia';
  concepto?: 'sueldo' | 'adelanto' | 'hora_extra' | 'aguinaldo' | 'bonus' | 'otro';
  comentario: string;
  fechaStandBy?: string;
  estado?: 'activo' | 'cancelado';
  confirmado?: boolean; // Para cheques: false = pendiente, true = confirmado/cobrado
  // Nuevos campos para manejo de cheques de terceros
  estadoCheque?: 'recibido' | 'depositado' | 'pagado_proveedor' | 'endosado';
  chequeRelacionadoId?: string;
  entrada?: number;
  salida?: number;
  // Campos específicos para transferencias
  cuentaOrigen?: 'PROVINCIA' | 'SANTANDER' | 'EFECTIVO' | 'FCI' | 'RESERVA';
  cuentaDestino?: 'PROVINCIA' | 'SANTANDER' | 'EFECTIVO' | 'FCI' | 'RESERVA';
  montoTransferencia?: number;
  banco: 'PROVINCIA' | 'SANTANDER' | 'EFECTIVO' | 'FCI' | 'RESERVA';
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
  unidadMedida: 'unidad' | 'kilo' | 'metro' | 'litro' | 'caja' | 'paquete';
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
  documentoCliente: string;
  items: ItemVenta[];
  subtotal: number;
  descuentoTotal: number;
  iva: number;
  total: number;
  medioPago: typeof MEDIOS_PAGO_VENTAS[number];
  detallesPago?: string;
  banco?: typeof BANCOS[number];
  estado: 'pendiente' | 'confirmada' | 'anulada' | 'parcial';
  observaciones?: string;
  vendedor: string;
  gastoRelacionadoId?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  fechaAnulacion?: string;
  motivoAnulacion?: string;
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