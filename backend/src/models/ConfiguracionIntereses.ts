import mongoose, { Document } from 'mongoose';

export interface IConfiguracionIntereses extends Document {
  tasaMensualVigente: number; // Porcentaje mensual (ej: 5 para 5%)
  fechaVigenciaDesde: Date;
  fechaVigenciaHasta?: Date;
  aplicaDesde: number; // Día desde el cual aplica (31 por defecto)
  observaciones?: string;
  fuenteReferencia: string; // Ej: "Banco Nación - Resolución 123/2025"
  creadoPor: string;
  createdAt: Date;
  updatedAt: Date;
}

const configuracionInteresesSchema = new mongoose.Schema<IConfiguracionIntereses>({
  tasaMensualVigente: {
    type: Number,
    required: [true, 'La tasa mensual es requerida'],
    min: [0, 'La tasa no puede ser negativa'],
    max: [100, 'La tasa no puede superar 100%']
  },
  fechaVigenciaDesde: {
    type: Date,
    required: [true, 'La fecha de vigencia desde es requerida'],
    default: Date.now
  },
  fechaVigenciaHasta: {
    type: Date,
    validate: {
      validator: function(this: IConfiguracionIntereses, v: Date) {
        return !v || v > this.fechaVigenciaDesde;
      },
      message: 'La fecha hasta debe ser posterior a la fecha desde'
    }
  },
  aplicaDesde: {
    type: Number,
    required: [true, 'El día de aplicación es requerido'],
    default: 31,
    min: [1, 'El día debe ser al menos 1'],
    max: [365, 'El día no puede superar 365']
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres']
  },
  fuenteReferencia: {
    type: String,
    required: [true, 'La fuente de referencia es requerida'],
    trim: true,
    maxlength: [200, 'La fuente no puede exceder 200 caracteres']
  },
  creadoPor: {
    type: String,
    required: [true, 'El usuario creador es requerido'],
    trim: true
  }
}, {
  timestamps: true
});

// Índices para búsqueda eficiente
configuracionInteresesSchema.index({ fechaVigenciaDesde: -1 });
configuracionInteresesSchema.index({ fechaVigenciaHasta: 1 });

// Método estático para obtener la configuración vigente
configuracionInteresesSchema.statics.obtenerVigente = async function(fecha?: Date) {
  const fechaConsulta = fecha || new Date();
  
  return await this.findOne({
    fechaVigenciaDesde: { $lte: fechaConsulta },
    $or: [
      { fechaVigenciaHasta: null },
      { fechaVigenciaHasta: { $gte: fechaConsulta } }
    ]
  }).sort({ fechaVigenciaDesde: -1 });
};

// Método virtual para calcular tasa diaria
configuracionInteresesSchema.virtual('tasaDiariaCalculada').get(function(this: IConfiguracionIntereses) {
  return this.tasaMensualVigente / 30;
});

// Asegurar que los virtuales se incluyan en JSON
configuracionInteresesSchema.set('toJSON', { virtuals: true });
configuracionInteresesSchema.set('toObject', { virtuals: true });

const ConfiguracionIntereses = mongoose.model<IConfiguracionIntereses>('ConfiguracionIntereses', configuracionInteresesSchema);

export default ConfiguracionIntereses;
