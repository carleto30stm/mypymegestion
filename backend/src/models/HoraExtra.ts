import mongoose, { Document, Schema } from 'mongoose';

export interface IHoraExtra extends Document {
  empleadoId: mongoose.Types.ObjectId;
  empleadoNombre: string;
  empleadoApellido: string;
  fecha: Date;
  cantidadHoras: number;
  valorHora: number;
  montoTotal: number;
  descripcion?: string;
  estado: 'registrada' | 'pagada' | 'cancelada';
  fechaCreacion: Date;
  fechaPago?: Date;
  gastoRelacionadoId?: mongoose.Types.ObjectId;
}

const HoraExtraSchema: Schema = new Schema({
  empleadoId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'El ID del empleado es requerido']
  },
  empleadoNombre: {
    type: String,
    required: [true, 'El nombre del empleado es requerido'],
    trim: true
  },
  empleadoApellido: {
    type: String,
    required: [true, 'El apellido del empleado es requerido'],
    trim: true
  },
  fecha: {
    type: Date,
    required: [true, 'La fecha es requerida']
  },
  cantidadHoras: {
    type: Number,
    required: [true, 'La cantidad de horas es requerida'],
    min: [0.1, 'La cantidad de horas debe ser mayor a 0']
  },
  valorHora: {
    type: Number,
    required: [true, 'El valor por hora es requerido'],
    min: [0, 'El valor por hora debe ser mayor o igual a 0']
  },
  montoTotal: {
    type: Number,
    min: [0, 'El monto total debe ser mayor o igual a 0']
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder los 500 caracteres']
  },
  estado: {
    type: String,
    enum: ['registrada', 'pagada', 'cancelada'],
    default: 'registrada',
    required: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaPago: {
    type: Date
  },
  gastoRelacionadoId: {
    type: Schema.Types.ObjectId,
    ref: 'Gasto'
  }
}, {
  timestamps: true
});

// Middleware para calcular el monto total antes de guardar
HoraExtraSchema.pre<IHoraExtra>('save', function(next) {
  // Factor de 1.5 para horas extra
  if (this.cantidadHoras && this.valorHora) {
    this.montoTotal = this.cantidadHoras * this.valorHora * 1.5;
  }
  next();
});

// Middleware para calcular el monto total antes de actualizar
HoraExtraSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  if (update && update.cantidadHoras && update.valorHora) {
    update.montoTotal = update.cantidadHoras * update.valorHora * 1.5;
  }
  next();
});

// Índices para mejor rendimiento
HoraExtraSchema.index({ empleadoId: 1, fecha: -1 });
HoraExtraSchema.index({ estado: 1 });
HoraExtraSchema.index({ fechaCreacion: -1 });

const HoraExtra = mongoose.model<IHoraExtra>('HoraExtra', HoraExtraSchema);

export default HoraExtra;