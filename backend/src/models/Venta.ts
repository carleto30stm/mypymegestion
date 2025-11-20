import mongoose, { Document, Schema } from 'mongoose';
import { 
  CAJAS, 
  MEDIO_PAGO, 
  ESTADOS_VENTA,
  ESTADOS_VENTA_GRANULAR, // Nuevo enum para estados granulares (Fase 2)
  ESTADOS_ENTREGA, 
  ESTADOS_COBRANZA, 
  ESTADOS_CHEQUE,
  MOMENTO_COBRO
} from '../Types/Types.js';

type MedioPago = typeof MEDIO_PAGO[number];
type Cajas = typeof CAJAS[number];
type EstadoVenta = typeof ESTADOS_VENTA[number];
type EstadoVentaGranular = typeof ESTADOS_VENTA_GRANULAR[number]; // Fase 2
type EstadoEntrega = typeof ESTADOS_ENTREGA[number];
type EstadoCobranza = typeof ESTADOS_COBRANZA[number];
type EstadoCheque = typeof ESTADOS_CHEQUE[number];
type MomentoCobro = typeof MOMENTO_COBRO[number];

// Interface para item de venta
export interface IItemVenta {
  productoId: mongoose.Types.ObjectId;
  codigoProducto: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  descuento: number;
  total: number;
}

// Interface para la venta
export interface IVenta extends Document {
  numeroVenta: string;
  fecha: Date;
  clienteId: mongoose.Types.ObjectId;
  nombreCliente: string;
  documentoCliente: string;
  items: IItemVenta[];
  subtotal: number;
  descuentoTotal: number;
  iva: number;
  total: number;
  medioPago: MedioPago;
  momentoCobro: MomentoCobro; // Cuándo se cobra: anticipado, contra_entrega, diferido
  detallesPago?: string; // Para pagos mixtos o información adicional
  banco?: Cajas;
  estado: EstadoVenta; // Estado legacy (mantener compatibilidad)
  estadoGranular?: EstadoVentaGranular; // Estado detallado (Fase 2 - opcional para migración gradual)
  observaciones?: string;
  vendedor: string; // Usuario que realizó la venta
  gastoRelacionadoId?: mongoose.Types.ObjectId; // Relación con tabla Gasto
  fechaCreacion: Date;
  fechaActualizacion: Date;
  fechaAnulacion?: Date;
  motivoAnulacion?: string;
  usuarioAnulacion?: string; // Usuario que realizó la anulación
  usuarioConfirmacion?: string; // Usuario que confirmó la venta
  creadoPor?: string; // Username del usuario que creó la venta
  
  // Campos fiscales
  aplicaIVA: boolean;
  requiereFacturaAFIP: boolean;
  
  // Campos para cheques
  datosCheque?: {
    numeroCheque: string;
    bancoEmisor: string;
    cuitTitular?: string;
    titularCheque?: string;
    fechaEmision: Date;
    fechaVencimiento: Date;
    monto: number;
    estadoCheque: EstadoCheque;
    fechaDeposito?: Date;
    observaciones?: string;
  };
  
  // Campos para remito y entrega
  estadoEntrega: EstadoEntrega;
  remitoId?: mongoose.Types.ObjectId;
  direccionEntrega?: string;
  fechaEntrega?: Date;
  
  // Campos para cobranza
  estadoCobranza: EstadoCobranza;
  montoCobrado: number;
  saldoPendiente: number;
  recibosRelacionados?: mongoose.Types.ObjectId[];
  ultimaCobranza?: Date;
  
  // Campos para facturación
  facturaId?: mongoose.Types.ObjectId;
  facturada: boolean;
}

const ItemVentaSchema = new Schema({
  productoId: {
    type: Schema.Types.ObjectId,
    ref: 'Producto',
    required: [true, 'El ID del producto es requerido']
  },
  codigoProducto: {
    type: String,
    required: [true, 'El código del producto es requerido'],
    trim: true
  },
  nombreProducto: {
    type: String,
    required: [true, 'El nombre del producto es requerido'],
    trim: true
  },
  cantidad: {
    type: Number,
    required: [true, 'La cantidad es requerida'],
    min: [0.001, 'La cantidad debe ser mayor a 0']
  },
  precioUnitario: {
    type: Number,
    required: [true, 'El precio unitario es requerido'],
    min: [0, 'El precio unitario debe ser mayor o igual a 0']
  },
  subtotal: {
    type: Number,
    required: [true, 'El subtotal es requerido'],
    min: [0, 'El subtotal debe ser mayor o igual a 0']
  },
  descuento: {
    type: Number,
    default: 0,
    min: [0, 'El descuento debe ser mayor o igual a 0']
  },
  total: {
    type: Number,
    required: [true, 'El total es requerido'],
    min: [0, 'El total debe ser mayor o igual a 0']
  }
});

const VentaSchema = new Schema({
  numeroVenta: {
    type: String,
    unique: true,
    trim: true
    // No requerido porque se genera automáticamente en el middleware pre-save
  },
  fecha: {
    type: Date,
    required: [true, 'La fecha es requerida'],
    default: Date.now
  },
  clienteId: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'El ID del cliente es requerido']
  },
  nombreCliente: {
    type: String,
    required: [true, 'El nombre del cliente es requerido'],
    trim: true
  },
  documentoCliente: {
    type: String,
    required: [true, 'El documento del cliente es requerido'],
    trim: true
  },
  items: {
    type: [ItemVentaSchema],
    required: [true, 'Los items son requeridos'],
    validate: {
      validator: function(v: IItemVenta[]) {
        return v && v.length > 0;
      },
      message: 'Debe haber al menos un item en la venta'
    }
  },
  subtotal: {
    type: Number,
    required: [true, 'El subtotal es requerido'],
    min: [0, 'El subtotal debe ser mayor o igual a 0']
  },
  descuentoTotal: {
    type: Number,
    default: 0,
    min: [0, 'El descuento total debe ser mayor o igual a 0']
  },
  iva: {
    type: Number,
    default: 0,
    min: [0, 'El IVA debe ser mayor o igual a 0']
  },
  total: {
    type: Number,
    required: [true, 'El total es requerido'],
    min: [0, 'El total debe ser mayor o igual a 0']
  },
  medioPago: {
    type: String,
    required: [true, 'El medio de pago es requerido'],
    enum: MEDIO_PAGO,
    default: 'EFECTIVO'
  },
  momentoCobro: {
    type: String,
    required: [true, 'El momento de cobro es requerido'],
    enum: MOMENTO_COBRO,
    default: 'diferido' // Por defecto, ventas a crédito
  },
  detallesPago: {
    type: String,
    trim: true,
    maxlength: [500, 'Los detalles de pago no pueden exceder 500 caracteres']
  },
  banco: {
    type: String,
    enum: ['PROVINCIA', 'SANTANDER', 'EFECTIVO', 'FCI', 'RESERVA']
  },
  estado: {
    type: String,
    required: [true, 'El estado es requerido'],
    enum: ESTADOS_VENTA,
    default: 'pendiente'
  },
  estadoGranular: {
    type: String,
    enum: ESTADOS_VENTA_GRANULAR,
    default: undefined, // Opcional para migración gradual
    index: true
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las observaciones no pueden exceder 1000 caracteres']
  },
  vendedor: {
    type: String,
    required: [true, 'El vendedor es requerido'],
    trim: true
  },
  gastoRelacionadoId: {
    type: Schema.Types.ObjectId,
    ref: 'Gasto'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  fechaAnulacion: {
    type: Date
  },
  motivoAnulacion: {
    type: String,
    trim: true,
    maxlength: [500, 'El motivo de anulación no puede exceder 500 caracteres']
  },
  usuarioAnulacion: {
    type: String,
    trim: true
  },
  usuarioConfirmacion: {
    type: String,
    trim: true
  },
  // Campo para auditoría: usuario que creó el registro
  creadoPor: {
    type: String, // Username del usuario que creó el registro
    required: false // Opcional para compatibilidad con registros antiguos
  },
  // Campos fiscales
  aplicaIVA: {
    type: Boolean,
    required: true,
    default: true
  },
  requiereFacturaAFIP: {
    type: Boolean,
    default: false
  },
  // Campos para cheques
  datosCheque: {
    numeroCheque: {
      type: String,
      trim: true,
      uppercase: true
    },
    bancoEmisor: {
      type: String,
      trim: true
    },
    cuitTitular: {
      type: String,
      trim: true
    },
    titularCheque: {
      type: String,
      trim: true
    },
    fechaEmision: Date,
    fechaVencimiento: Date,
    monto: Number,
    estadoCheque: {
      type: String,
      enum: ESTADOS_CHEQUE,
      default: 'recibido'
    },
    fechaDeposito: Date,
    observaciones: {
      type: String,
      trim: true,
      maxlength: [500, 'Las observaciones del cheque no pueden exceder 500 caracteres']
    }
  },
  // Campos para remito y entrega
  estadoEntrega: {
    type: String,
    enum: ESTADOS_ENTREGA,
    default: 'sin_remito'
  },
  remitoId: {
    type: Schema.Types.ObjectId,
    ref: 'Remito'
  },
  direccionEntrega: {
    type: String,
    trim: true,
    maxlength: [300, 'La dirección de entrega no puede exceder 300 caracteres']
  },
  fechaEntrega: Date,
  // Campos para cobranza
  estadoCobranza: {
    type: String,
    enum: ESTADOS_COBRANZA,
    default: 'sin_cobrar'
  },
  montoCobrado: {
    type: Number,
    default: 0,
    min: [0, 'El monto cobrado debe ser mayor o igual a 0']
  },
  saldoPendiente: {
    type: Number,
    default: 0
  },
  recibosRelacionados: [{
    type: Schema.Types.ObjectId,
    ref: 'ReciboPago'
  }],
  ultimaCobranza: Date,
  // Campos para facturación
  facturaId: {
    type: Schema.Types.ObjectId,
    ref: 'Factura'
  },
  facturada: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: {
    createdAt: 'fechaCreacion',
    updatedAt: 'fechaActualizacion'
  }
});

// Middleware para calcular totales antes de guardar
VentaSchema.pre('save', function(next) {
  // Calcular subtotal de items
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  
  // Calcular descuento total
  this.descuentoTotal = this.items.reduce((sum, item) => sum + item.descuento, 0);
  
  // Calcular IVA dinámico (21% solo si aplicaIVA es true)
  if (this.aplicaIVA) {
    this.iva = (this.subtotal - this.descuentoTotal) * 0.21;
  } else {
    this.iva = 0;
  }
  
  // Calcular total (subtotal - descuentos + IVA)
  this.total = this.subtotal - this.descuentoTotal + this.iva;
  
  // Calcular saldo pendiente
  this.saldoPendiente = this.total - this.montoCobrado;
  
  next();
});

// Middleware para generar número de venta automático
VentaSchema.pre('save', async function(next) {
  if (this.isNew && !this.numeroVenta) {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    
    // Buscar última venta del mes
    const ultimaVenta = await mongoose.model('Venta')
      .findOne({ numeroVenta: new RegExp(`^V${año}${mes}`) })
      .sort({ numeroVenta: -1 });
    
    let secuencia = 1;
    if (ultimaVenta && ultimaVenta.numeroVenta) {
      const ultimaSecuencia = parseInt(ultimaVenta.numeroVenta.slice(-4));
      secuencia = ultimaSecuencia + 1;
    }
    
    this.numeroVenta = `V${año}${mes}${String(secuencia).padStart(4, '0')}`;
  }
  next();
});

// Índices para búsqueda eficiente
VentaSchema.index({ fecha: -1 });
VentaSchema.index({ clienteId: 1 });
VentaSchema.index({ estado: 1 });
VentaSchema.index({ vendedor: 1 });
// Índices compuestos para búsquedas combinadas
VentaSchema.index({ clienteId: 1, fecha: -1 }); // Ventas de un cliente ordenadas por fecha
VentaSchema.index({ estado: 1, fecha: -1 }); // Ventas por estado y fecha
VentaSchema.index({ estadoCobranza: 1, fecha: -1 }); // Ventas pendientes de cobro
VentaSchema.index({ estadoEntrega: 1, fecha: -1 }); // Ventas por estado de entrega
VentaSchema.index({ facturada: 1, requiereFacturaAFIP: 1, estado: 1 }); // Ventas sin facturar

const Venta = mongoose.model<IVenta>('Venta', VentaSchema);

export default Venta;
