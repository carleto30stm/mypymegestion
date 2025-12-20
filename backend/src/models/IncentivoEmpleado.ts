import mongoose from 'mongoose';

export interface IIncentivoEmpleado extends mongoose.Document {
  empleadoId: mongoose.Types.ObjectId;
  tipo: 'productividad' | 'ventas' | 'presentismo_perfecto' | 'antiguedad_especial' | 'premio' | 'comision' | 'reconocimiento' | 'otro';
  motivo: string;
  monto: number;
  esPorcentaje: boolean; // Si es true, monto representa un % del sueldo base
  fecha: Date;
  periodoAplicacion: string; // YYYY-MM
  // Referencia opcional al periodo (LiquidacionPeriodo) específico
  periodoId?: mongoose.Types.ObjectId;
  estado: 'pendiente' | 'pagado' | 'anulado';

  // Metadatos de aplicación
  aplicadoEnLiquidacionId?: mongoose.Types.ObjectId;
  fechaAplicacion?: Date;
  aplicadoPor?: string;

  observaciones?: string;
  montoCalculado?: number; // Campo virtual para el monto real calculado
  creadoPor?: mongoose.Types.ObjectId;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

const incentivoEmpleadoSchema = new mongoose.Schema<IIncentivoEmpleado>({
  empleadoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'El empleado es requerido']
  },
  tipo: {
    type: String,
    enum: ['productividad', 'ventas', 'presentismo_perfecto', 'antiguedad_especial', 'premio', 'comision', 'reconocimiento', 'otro'],
    required: [true, 'El tipo de incentivo es requerido']
  },
  motivo: {
    type: String,
    required: [true, 'El motivo es requerido'],
    trim: true,
    maxlength: [500, 'El motivo no puede exceder 500 caracteres']
  },
  monto: {
    type: Number,
    required: [true, 'El monto es requerido'],
    min: [0, 'El monto debe ser mayor o igual a 0']
  },
  esPorcentaje: {
    type: Boolean,
    default: false
  },
  fecha: {
    type: Date,
    required: [true, 'La fecha es requerida'],
    default: Date.now
  },
  periodoAplicacion: {
    type: String,
    required: [true, 'El período de aplicación es requerido'],
    match: [/^\d{4}-\d{2}$/, 'El período debe tener formato YYYY-MM']
  },
  // Referencia opcional al periodo (LiquidacionPeriodo) específico
  periodoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiquidacionPeriodo'
  },
  estado: {
    type: String,
    enum: ['pendiente', 'pagado', 'anulado'],
    default: 'pendiente'
  },
  // Metadatos de pago
  aplicadoEnLiquidacionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiquidacionPeriodo'
  },
  fechaAplicacion: { type: Date },
  aplicadoPor: { type: String },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las observaciones no pueden exceder 1000 caracteres']
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'fechaCreacion',
    updatedAt: 'fechaActualizacion'
  }
});

// Índices para búsqueda eficiente
incentivoEmpleadoSchema.index({ empleadoId: 1 });
incentivoEmpleadoSchema.index({ periodoAplicacion: 1 });
incentivoEmpleadoSchema.index({ periodoId: 1 });
incentivoEmpleadoSchema.index({ estado: 1 });
incentivoEmpleadoSchema.index({ empleadoId: 1, periodoAplicacion: 1 });
incentivoEmpleadoSchema.index({ aplicadoEnLiquidacionId: 1 });

// Tipos de incentivo con descripciones para el frontend
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

const IncentivoEmpleado = mongoose.model<IIncentivoEmpleado>('IncentivoEmpleado', incentivoEmpleadoSchema);

export default IncentivoEmpleado;
