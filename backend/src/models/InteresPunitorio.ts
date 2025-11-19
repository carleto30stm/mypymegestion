import mongoose, { Document } from 'mongoose';

// Interface para las acciones/historial del interés
export interface IAccionInteres {
  fecha: Date;
  tipo: 'calculo' | 'cobro' | 'condonacion';
  monto: number;
  usuario: string;
  observaciones?: string;
  notaDebitoId?: string; // Si se emitió una ND al cobrar
}

export interface IInteresPunitorio extends Document {
  clienteId: mongoose.Types.ObjectId;
  documentoRelacionado: {
    tipo: 'venta' | 'recibo' | 'cheque';
    documentoId: mongoose.Types.ObjectId;
    numeroDocumento: string;
  };
  
  // Capital sobre el que se calculan intereses
  capitalOriginal: number;
  
  // Fechas de cálculo
  fechaVencimiento: Date; // Día 30 desde la venta/cobro
  fechaInicioPunitorio: Date; // Día 31 (automático)
  fechaFinCalculo: Date; // Última fecha de cálculo
  
  // Tasa y cálculo
  tasaInteresMensual: number; // Tasa vigente al momento del cálculo
  tasaDiariaAplicada: number; // tasaMensual / 30
  diasTranscurridos: number;
  
  // Montos de interés
  interesDevengado: number; // Total calculado
  interesCobrado: number; // Lo que efectivamente cobré
  interesCondonado: number; // Lo que perdoné
  interesPendiente: number; // Devengado - Cobrado - Condonado
  
  // Estado
  estado: 'devengando' | 'cobrado_parcial' | 'cobrado_total' | 'condonado_parcial' | 'condonado_total';
  
  // Trazabilidad de acciones
  acciones: IAccionInteres[];
  
  observaciones?: string;
  creadoPor: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Métodos
  calcularInteresActual(fechaHasta?: Date): number;
  actualizarCalculo(usuario?: string): Promise<IInteresPunitorio>;
}

const interesPunitorioSchema = new mongoose.Schema<IInteresPunitorio>({
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'El cliente es requerido'],
    index: true
  },
  documentoRelacionado: {
    tipo: {
      type: String,
      required: [true, 'El tipo de documento es requerido'],
      enum: ['venta', 'recibo', 'cheque']
    },
    documentoId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'El ID del documento es requerido']
    },
    numeroDocumento: {
      type: String,
      required: [true, 'El número de documento es requerido'],
      trim: true
    }
  },
  capitalOriginal: {
    type: Number,
    required: [true, 'El capital original es requerido'],
    min: [0, 'El capital debe ser mayor o igual a 0']
  },
  fechaVencimiento: {
    type: Date,
    required: [true, 'La fecha de vencimiento es requerida']
  },
  fechaInicioPunitorio: {
    type: Date,
    required: [true, 'La fecha de inicio del punitorio es requerida']
  },
  fechaFinCalculo: {
    type: Date,
    default: Date.now
  },
  tasaInteresMensual: {
    type: Number,
    required: [true, 'La tasa mensual es requerida'],
    min: [0, 'La tasa debe ser mayor o igual a 0']
  },
  tasaDiariaAplicada: {
    type: Number,
    required: [true, 'La tasa diaria es requerida'],
    min: [0, 'La tasa diaria debe ser mayor o igual a 0']
  },
  diasTranscurridos: {
    type: Number,
    default: 0,
    min: [0, 'Los días no pueden ser negativos']
  },
  interesDevengado: {
    type: Number,
    default: 0,
    min: [0, 'El interés devengado no puede ser negativo']
  },
  interesCobrado: {
    type: Number,
    default: 0,
    min: [0, 'El interés cobrado no puede ser negativo']
  },
  interesCondonado: {
    type: Number,
    default: 0,
    min: [0, 'El interés condonado no puede ser negativo']
  },
  interesPendiente: {
    type: Number,
    default: 0,
    min: [0, 'El interés pendiente no puede ser negativo']
  },
  estado: {
    type: String,
    required: [true, 'El estado es requerido'],
    enum: ['devengando', 'cobrado_parcial', 'cobrado_total', 'condonado_parcial', 'condonado_total'],
    default: 'devengando'
  },
  acciones: [{
    fecha: {
      type: Date,
      required: true,
      default: Date.now
    },
    tipo: {
      type: String,
      required: true,
      enum: ['calculo', 'cobro', 'condonacion']
    },
    monto: {
      type: Number,
      required: true,
      min: 0
    },
    usuario: {
      type: String,
      required: true,
      trim: true
    },
    observaciones: {
      type: String,
      trim: true,
      maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres']
    },
    notaDebitoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MovimientoCuentaCorriente'
    }
  }],
  observaciones: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las observaciones no pueden exceder 1000 caracteres']
  },
  creadoPor: {
    type: String,
    required: [true, 'El usuario creador es requerido'],
    trim: true
  }
}, {
  timestamps: true
});

// Índices compuestos para búsquedas eficientes
interesPunitorioSchema.index({ clienteId: 1, estado: 1 });
interesPunitorioSchema.index({ 'documentoRelacionado.documentoId': 1 });
interesPunitorioSchema.index({ estado: 1, fechaFinCalculo: -1 });
interesPunitorioSchema.index({ clienteId: 1, createdAt: -1 });

// Método para calcular interés actualizado
interesPunitorioSchema.methods.calcularInteresActual = function(this: IInteresPunitorio, fechaHasta?: Date): number {
  const fechaCalculo = fechaHasta || new Date();
  const msDia = 1000 * 60 * 60 * 24;
  let diasDesdeInicio = Math.floor(
    (fechaCalculo.getTime() - this.fechaInicioPunitorio.getTime()) / msDia
  );
  
  // Si la fecha de cálculo coincide con la fecha de inicio del punitorio, contamos como 1 día (inclusive)
  if (diasDesdeInicio === 0 && fechaCalculo.toDateString() === this.fechaInicioPunitorio.toDateString()) {
    diasDesdeInicio = 1;
  }

  if (diasDesdeInicio <= 0) return 0;
  
  // Interés = Capital × (Tasa Diaria / 100) × Días
  return this.capitalOriginal * (this.tasaDiariaAplicada / 100) * diasDesdeInicio;
};

// Método para actualizar cálculo
interesPunitorioSchema.methods.actualizarCalculo = async function(this: IInteresPunitorio, usuario: string = 'sistema') {
  const fechaActual = new Date();
  const msDia = 1000 * 60 * 60 * 24;
  let diasDesdeInicio = Math.floor(
    (fechaActual.getTime() - this.fechaInicioPunitorio.getTime()) / msDia
  );
  // Cuenta inclusiva para el primer día
  if (diasDesdeInicio === 0 && fechaActual.toDateString() === this.fechaInicioPunitorio.toDateString()) {
    diasDesdeInicio = 1;
  }
  
  if (diasDesdeInicio <= 0) return this;
  
  this.diasTranscurridos = diasDesdeInicio;
  this.interesDevengado = this.calcularInteresActual(fechaActual);
  this.interesPendiente = this.interesDevengado - this.interesCobrado - this.interesCondonado;
  this.fechaFinCalculo = fechaActual;
  
  // Registrar acción de cálculo
  this.acciones.push({
    fecha: fechaActual,
    tipo: 'calculo',
    monto: this.interesDevengado,
    usuario,
    observaciones: `Cálculo automático - ${diasDesdeInicio} días × ${this.tasaDiariaAplicada.toFixed(4)}% diario`
  } as IAccionInteres);
  
  return await this.save();
};

// Asegurar que los virtuales se incluyan en JSON
interesPunitorioSchema.set('toJSON', { virtuals: true });
interesPunitorioSchema.set('toObject', { virtuals: true });

const InteresPunitorio = mongoose.model<IInteresPunitorio>('InteresPunitorio', interesPunitorioSchema);

export default InteresPunitorio;
