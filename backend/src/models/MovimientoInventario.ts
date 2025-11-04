import mongoose, { Document, Schema } from 'mongoose';

export interface IMovimientoInventario extends Document {
  fecha: Date;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'produccion' | 'devolucion' | 'merma';
  materiaPrimaId: mongoose.Types.ObjectId;
  codigoMateriaPrima: string;
  nombreMateriaPrima: string;
  cantidad: number;
  precioUnitario?: number;
  valorTotal?: number;
  stockAnterior: number;
  stockNuevo: number;
  unidadMedida: string;
  // Referencia al documento origen
  documentoOrigen?: string; // 'compra', 'ajuste_manual', 'produccion', etc.
  documentoOrigenId?: mongoose.Types.ObjectId;
  numeroDocumento?: string;
  // Información adicional
  motivo?: string;
  observaciones?: string;
  usuario: string; // Usuario que realizó el movimiento
  ubicacion?: string;
  lote?: string;
  fechaVencimiento?: Date;
  fechaCreacion: Date;
}

const MovimientoInventarioSchema = new Schema({
  fecha: {
    type: Date,
    required: [true, 'La fecha es requerida'],
    default: Date.now
  },
  tipo: {
    type: String,
    required: [true, 'El tipo de movimiento es requerido'],
    enum: ['entrada', 'salida', 'ajuste', 'produccion', 'devolucion', 'merma']
  },
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
    validate: {
      validator: function(v: number) {
        return v !== 0;
      },
      message: 'La cantidad no puede ser 0'
    }
  },
  precioUnitario: {
    type: Number,
    min: [0, 'El precio unitario debe ser mayor o igual a 0']
  },
  valorTotal: {
    type: Number,
    min: [0, 'El valor total debe ser mayor o igual a 0']
  },
  stockAnterior: {
    type: Number,
    required: [true, 'El stock anterior es requerido'],
    min: [0, 'El stock anterior debe ser mayor o igual a 0']
  },
  stockNuevo: {
    type: Number,
    required: [true, 'El stock nuevo es requerido'],
    min: [0, 'El stock nuevo debe ser mayor o igual a 0']
  },
  unidadMedida: {
    type: String,
    required: [true, 'La unidad de medida es requerida'],
    trim: true
  },
  documentoOrigen: {
    type: String,
    trim: true
  },
  documentoOrigenId: {
    type: Schema.Types.ObjectId
  },
  numeroDocumento: {
    type: String,
    trim: true
  },
  motivo: {
    type: String,
    trim: true,
    maxlength: [200, 'El motivo no puede exceder 200 caracteres']
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres']
  },
  usuario: {
    type: String,
    required: [true, 'El usuario es requerido'],
    trim: true
  },
  ubicacion: {
    type: String,
    trim: true
  },
  lote: {
    type: String,
    trim: true
  },
  fechaVencimiento: {
    type: Date
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'fechaCreacion',
    updatedAt: false // No necesitamos updatedAt para movimientos (son inmutables)
  }
});

// Índices para búsqueda eficiente
MovimientoInventarioSchema.index({ fecha: -1 });
MovimientoInventarioSchema.index({ materiaPrimaId: 1, fecha: -1 });
MovimientoInventarioSchema.index({ tipo: 1 });
MovimientoInventarioSchema.index({ documentoOrigenId: 1 });
MovimientoInventarioSchema.index({ usuario: 1 });

// Método para calcular valor total antes de guardar
MovimientoInventarioSchema.pre('save', function(next) {
  if (this.precioUnitario && this.cantidad) {
    this.valorTotal = Math.abs(this.cantidad) * this.precioUnitario;
  }
  next();
});

const MovimientoInventario = mongoose.model<IMovimientoInventario>('MovimientoInventario', MovimientoInventarioSchema);

export default MovimientoInventario;
