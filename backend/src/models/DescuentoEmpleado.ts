import mongoose from 'mongoose';

export interface IDescuentoEmpleado extends mongoose.Document {
  empleadoId: mongoose.Types.ObjectId;
  tipo: 'sancion' | 'faltante_caja' | 'rotura' | 'ausencia_injustificada' | 'llegada_tarde' | 'mala_operacion' | 'otro';
  motivo: string;
  monto: number;
  esPorcentaje: boolean; // Si es true, monto representa un % del sueldo base
  fecha: Date;
  periodoAplicacion: string; // YYYY-MM
  // Referencia opcional al periodo (LiquidacionPeriodo) específico (por ejemplo 1ª quincena / 2ª quincena)
  periodoId?: mongoose.Types.ObjectId;
  estado: 'pendiente' | 'aplicado' | 'anulado';

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

const descuentoEmpleadoSchema = new mongoose.Schema<IDescuentoEmpleado>({
  empleadoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'El empleado es requerido']
  },
  tipo: {
    type: String,
    enum: ['sancion', 'faltante_caja', 'rotura', 'ausencia_injustificada', 'llegada_tarde', 'mala_operacion', 'otro'],
    required: [true, 'El tipo de descuento es requerido']
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
    required: [true, 'La fecha del hecho es requerida'],
    default: Date.now
  },
  periodoAplicacion: {
    type: String,
    required: [true, 'El período de aplicación es requerido'],
    match: [/^\d{4}-\d{2}$/, 'El período debe tener formato YYYY-MM']
  },
  // Referencia opcional al periodo (LiquidacionPeriodo) específico (por ejemplo 1ª quincena / 2ª quincena)
  periodoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiquidacionPeriodo'
  },
  estado: {
    type: String,
    enum: ['pendiente', 'aplicado', 'anulado'],
    default: 'pendiente'
  },
  // Metadatos de aplicación
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
descuentoEmpleadoSchema.index({ empleadoId: 1 });
descuentoEmpleadoSchema.index({ periodoAplicacion: 1 });
descuentoEmpleadoSchema.index({ periodoId: 1 });
descuentoEmpleadoSchema.index({ estado: 1 });
descuentoEmpleadoSchema.index({ empleadoId: 1, periodoAplicacion: 1 });
descuentoEmpleadoSchema.index({ aplicadoEnLiquidacionId: 1 });

// Tipos de descuento con descripciones para el frontend
export const TIPOS_DESCUENTO = {
  sancion: 'Sanción disciplinaria',
  faltante_caja: 'Faltante de caja',
  rotura: 'Rotura de mercadería/equipo',
  ausencia_injustificada: 'Ausencia injustificada',
  llegada_tarde: 'Llegadas tarde',
  mala_operacion: 'Mala operación',
  otro: 'Otro'
} as const;

const DescuentoEmpleado = mongoose.model<IDescuentoEmpleado>('DescuentoEmpleado', descuentoEmpleadoSchema);

export default DescuentoEmpleado;
