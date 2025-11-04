import mongoose, { Document, Schema } from 'mongoose';
import { CAJAS, MEDIO_PAGO } from '../Types/Types.js';

type MedioPago = typeof MEDIO_PAGO[number];
type Cajas = typeof CAJAS[number];

// Interface para item de compra
export interface IItemCompra {
  materiaPrimaId: mongoose.Types.ObjectId;
  codigoMateriaPrima: string;
  nombreMateriaPrima: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  descuento: number;
  total: number;
}

// Interface para la compra
export interface ICompra extends Document {
  numeroCompra: string;
  fecha: Date;
  fechaEntrega?: Date; // Fecha esperada de entrega
  fechaRecepcion?: Date; // Fecha real de recepción
  proveedorId: mongoose.Types.ObjectId;
  razonSocialProveedor: string;
  documentoProveedor: string;
  items: IItemCompra[];
  subtotal: number;
  descuentoTotal: number;
  iva: number;
  total: number;
  medioPago?: MedioPago;
  banco?: Cajas;
  detallesPago?: string;
  // Estados del flujo de compra
  estado: 'presupuesto' | 'pedido' | 'parcial' | 'recibido' | 'pagado' | 'anulado';
  // Información de factura del proveedor
  tipoComprobante?: 'Factura A' | 'Factura B' | 'Factura C' | 'Remito' | 'Presupuesto';
  numeroComprobante?: string;
  observaciones?: string;
  comprador: string; // Usuario que realizó la compra
  gastoRelacionadoId?: mongoose.Types.ObjectId; // Relación con tabla Gasto
  fechaCreacion: Date;
  fechaActualizacion: Date;
  fechaAnulacion?: Date;
  motivoAnulacion?: string;
}

const ItemCompraSchema = new Schema({
  materiaPrimaId: {
    type: Schema.Types.ObjectId,
    ref: 'MateriaPrima',
    required: [true, 'El ID de la materia prima es requerido']
  },
  codigoMateriaPrima: {
    type: String,
    required: [true, 'El código de la materia prima es requerido'],
    trim: true
  },
  nombreMateriaPrima: {
    type: String,
    required: [true, 'El nombre de la materia prima es requerido'],
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

const CompraSchema = new Schema({
  numeroCompra: {
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
  fechaEntrega: {
    type: Date
  },
  fechaRecepcion: {
    type: Date
  },
  proveedorId: {
    type: Schema.Types.ObjectId,
    ref: 'Proveedor',
    required: [true, 'El ID del proveedor es requerido']
  },
  razonSocialProveedor: {
    type: String,
    required: [true, 'La razón social del proveedor es requerida'],
    trim: true
  },
  documentoProveedor: {
    type: String,
    required: [true, 'El documento del proveedor es requerido'],
    trim: true
  },
  items: {
    type: [ItemCompraSchema],
    required: [true, 'Los items son requeridos'],
    validate: {
      validator: function(v: IItemCompra[]) {
        return v && v.length > 0;
      },
      message: 'Debe haber al menos un item en la compra'
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
    enum: MEDIO_PAGO
  },
  banco: {
    type: String,
    enum: CAJAS
  },
  detallesPago: {
    type: String,
    trim: true,
    maxlength: [500, 'Los detalles de pago no pueden exceder 500 caracteres']
  },
  estado: {
    type: String,
    required: [true, 'El estado es requerido'],
    enum: ['presupuesto', 'pedido', 'parcial', 'recibido', 'pagado', 'anulado'],
    default: 'presupuesto'
  },
  tipoComprobante: {
    type: String,
    enum: ['Factura A', 'Factura B', 'Factura C', 'Remito', 'Presupuesto']
  },
  numeroComprobante: {
    type: String,
    trim: true,
    maxlength: [50, 'El número de comprobante no puede exceder 50 caracteres']
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las observaciones no pueden exceder 1000 caracteres']
  },
  comprador: {
    type: String,
    required: [true, 'El comprador es requerido'],
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
  }
}, {
  timestamps: {
    createdAt: 'fechaCreacion',
    updatedAt: 'fechaActualizacion'
  }
});

// Middleware para calcular totales antes de guardar
CompraSchema.pre('save', function(next) {
  // Calcular subtotal de items
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  
  // Calcular descuento total
  this.descuentoTotal = this.items.reduce((sum, item) => sum + item.descuento, 0);
  
  // Calcular total (subtotal - descuentos + IVA)
  this.total = this.subtotal - this.descuentoTotal + this.iva;
  
  next();
});

// Middleware para generar número de compra automático
CompraSchema.pre('save', async function(next) {
  if (this.isNew && !this.numeroCompra) {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    
    // Buscar última compra del mes
    const ultimaCompra = await mongoose.model('Compra')
      .findOne({ numeroCompra: new RegExp(`^C${año}${mes}`) })
      .sort({ numeroCompra: -1 });
    
    let secuencia = 1;
    if (ultimaCompra && ultimaCompra.numeroCompra) {
      const ultimaSecuencia = parseInt(ultimaCompra.numeroCompra.slice(-4));
      secuencia = ultimaSecuencia + 1;
    }
    
    this.numeroCompra = `C${año}${mes}${String(secuencia).padStart(4, '0')}`;
  }
  next();
});

// Índices para búsqueda eficiente
CompraSchema.index({ fecha: -1 });
CompraSchema.index({ proveedorId: 1 });
CompraSchema.index({ estado: 1 });
CompraSchema.index({ comprador: 1 });
CompraSchema.index({ numeroComprobante: 1 });

const Compra = mongoose.model<ICompra>('Compra', CompraSchema);

export default Compra;
