import mongoose, { Document, Schema } from 'mongoose';
import { cajas, medioDePagos } from '../Types/Types.js';
type MedioPago = typeof medioDePagos[number];
type Cajas = typeof cajas[number];

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
  detallesPago?: string; // Para pagos mixtos o información adicional
  banco?: Cajas;
  estado: 'pendiente' | 'confirmada' | 'anulada' | 'parcial'; // parcial para cuenta corriente
  observaciones?: string;
  vendedor: string; // Usuario que realizó la venta
  gastoRelacionadoId?: mongoose.Types.ObjectId; // Relación con tabla Gasto
  fechaCreacion: Date;
  fechaActualizacion: Date;
  fechaAnulacion?: Date;
  motivoAnulacion?: string;
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
    enum: medioDePagos,
    default: 'Efectivo'
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
    enum: ['pendiente', 'confirmada', 'anulada', 'parcial'],
    default: 'pendiente'
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
  
  // Calcular total (subtotal - descuentos + IVA)
  this.total = this.subtotal - this.descuentoTotal + this.iva;
  
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
VentaSchema.index({ numeroVenta: 1 });
VentaSchema.index({ fecha: -1 });
VentaSchema.index({ clienteId: 1 });
VentaSchema.index({ estado: 1 });
VentaSchema.index({ vendedor: 1 });

const Venta = mongoose.model<IVenta>('Venta', VentaSchema);

export default Venta;
