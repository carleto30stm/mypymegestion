import mongoose, { Schema, Document } from 'mongoose';

// Interface para materia prima reservada/consumida
export interface IMateriaPrimaOrden {
  materiaPrimaId: mongoose.Types.ObjectId;
  codigoMateriaPrima: string;
  nombreMateriaPrima: string;
  cantidadNecesaria: number;
  cantidadReservada: number;
  cantidadConsumida: number;
  costo: number;
}

// Interface para el documento de Orden de Producción
export interface IOrdenProduccion extends Document {
  numeroOrden: string;
  fecha: Date;
  fechaInicio?: Date;
  fechaFinalizacion?: Date;
  recetaId: mongoose.Types.ObjectId;
  productoId: mongoose.Types.ObjectId;
  codigoProducto: string;
  nombreProducto: string;
  cantidadAProducir: number;
  unidadesProducidas: number;
  materiasPrimas: IMateriaPrimaOrden[];
  costoMateriasPrimas: number;
  costoManoObra: number;
  costoIndirecto: number;
  costoTotal: number;
  estado: 'planificada' | 'enviada' | 'en_proceso' | 'en_transito' | 'completada' | 'cancelada';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  responsable: string;
  observaciones?: string;
  motivoCancelacion?: string;
  // Producción externa
  esProduccionExterna?: boolean;
  proveedorId?: mongoose.Types.ObjectId;
  costoUnitarioManoObraExterna?: number; // Costo unitario del servicio de procesamiento externo
  fechaEnvio?: Date; // Fecha de envío a proveedor externo
  createdBy: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

const MateriaPrimaOrdenSchema = new Schema<IMateriaPrimaOrden>({
  materiaPrimaId: {
    type: Schema.Types.ObjectId,
    ref: 'MateriaPrima',
    required: true
  },
  codigoMateriaPrima: {
    type: String,
    required: true
  },
  nombreMateriaPrima: {
    type: String,
    required: true
  },
  cantidadNecesaria: {
    type: Number,
    required: true,
    min: [0, 'La cantidad necesaria no puede ser negativa']
  },
  cantidadReservada: {
    type: Number,
    default: 0,
    min: [0, 'La cantidad reservada no puede ser negativa']
  },
  cantidadConsumida: {
    type: Number,
    default: 0,
    min: [0, 'La cantidad consumida no puede ser negativa']
  },
  costo: {
    type: Number,
    required: true,
    min: [0, 'El costo no puede ser negativo']
  }
}, { _id: false });

const OrdenProduccionSchema = new Schema<IOrdenProduccion>({
  numeroOrden: {
    type: String,
    unique: true,
    trim: true
  },
  fecha: {
    type: Date,
    required: [true, 'La fecha es obligatoria'],
    default: Date.now
  },
  fechaInicio: {
    type: Date
  },
  fechaFinalizacion: {
    type: Date
  },
  recetaId: {
    type: Schema.Types.ObjectId,
    ref: 'Receta',
    required: [true, 'El ID de la receta es obligatorio']
  },
  productoId: {
    type: Schema.Types.ObjectId,
    ref: 'Producto',
    required: [true, 'El ID del producto es obligatorio']
  },
  codigoProducto: {
    type: String,
    required: [true, 'El código del producto es obligatorio'],
    trim: true
  },
  nombreProducto: {
    type: String,
    required: [true, 'El nombre del producto es obligatorio'],
    trim: true
  },
  cantidadAProducir: {
    type: Number,
    required: [true, 'La cantidad a producir es obligatoria'],
    min: [1, 'La cantidad a producir debe ser al menos 1']
  },
  unidadesProducidas: {
    type: Number,
    default: 0,
    min: [0, 'Las unidades producidas no pueden ser negativas']
  },
  materiasPrimas: {
    type: [MateriaPrimaOrdenSchema],
    required: true,
    validate: {
      validator: function(v: IMateriaPrimaOrden[]) {
        return v && v.length > 0;
      },
      message: 'La orden debe tener al menos una materia prima'
    }
  },
  costoMateriasPrimas: {
    type: Number,
    default: 0,
    min: [0, 'El costo de materias primas no puede ser negativo']
  },
  costoManoObra: {
    type: Number,
    default: 0,
    min: [0, 'El costo de mano de obra no puede ser negativo']
  },
  costoIndirecto: {
    type: Number,
    default: 0,
    min: [0, 'El costo indirecto no puede ser negativo']
  },
  costoTotal: {
    type: Number,
    default: 0,
    min: [0, 'El costo total no puede ser negativo']
  },
  estado: {
    type: String,
    enum: {
      values: ['planificada', 'enviada', 'en_proceso', 'en_transito', 'completada', 'cancelada'],
      message: 'Estado inválido: {VALUE}'
    },
    default: 'planificada'
  },
  prioridad: {
    type: String,
    enum: {
      values: ['baja', 'media', 'alta', 'urgente'],
      message: 'Prioridad inválida: {VALUE}'
    },
    default: 'media'
  },
  responsable: {
    type: String,
    required: [true, 'El responsable es obligatorio']
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [500, 'Las observaciones no pueden superar los 500 caracteres']
  },
  motivoCancelacion: {
    type: String,
    trim: true
  },
  // Producción externa
  esProduccionExterna: {
    type: Boolean,
    default: false
  },
  proveedorId: {
    type: Schema.Types.ObjectId,
    ref: 'Proveedor'
  },
  costoUnitarioManoObraExterna: {
    type: Number,
    default: 0,
    min: [0, 'El costo unitario de mano de obra externa no puede ser negativo']
  },
  fechaEnvio: {
    type: Date
  },
  createdBy: {
    type: String,
    required: [true, 'El creador es obligatorio']
  }
}, {
  timestamps: {
    createdAt: 'fechaCreacion',
    updatedAt: 'fechaActualizacion'
  }
});

// Índices
OrdenProduccionSchema.index({ fecha: -1 });
OrdenProduccionSchema.index({ estado: 1 });
OrdenProduccionSchema.index({ productoId: 1 });
OrdenProduccionSchema.index({ recetaId: 1 });
OrdenProduccionSchema.index({ prioridad: 1, estado: 1 });

// Middleware pre-save: generar número de orden y calcular costos
OrdenProduccionSchema.pre('save', async function(next) {
  try {
    // Generar número de orden si no existe
    if (!this.numeroOrden) {
      const fecha = new Date();
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      
      const ultimaOrden = await mongoose.model('OrdenProduccion').findOne({
        numeroOrden: new RegExp(`^OP${año}${mes}`)
      }).sort({ numeroOrden: -1 });

      let siguienteNumero = 1;
      if (ultimaOrden && ultimaOrden.numeroOrden) {
        const numeroActual = parseInt(ultimaOrden.numeroOrden.slice(-4));
        siguienteNumero = numeroActual + 1;
      }

      this.numeroOrden = `OP${año}${mes}${String(siguienteNumero).padStart(4, '0')}`;
    }

    // Calcular costos (con validación defensiva)
    if (this.materiasPrimas && Array.isArray(this.materiasPrimas)) {
      this.costoMateriasPrimas = this.materiasPrimas.reduce((total, mp) => {
        return total + (mp.costo * mp.cantidadNecesaria);
      }, 0);
    } else {
      this.costoMateriasPrimas = 0;
    }

    // Incluir costo de mano de obra externa si aplica (costo unitario * cantidad)
    const costoMOExterna = (this.costoUnitarioManoObraExterna || 0) * this.cantidadAProducir;
    this.costoTotal = this.costoMateriasPrimas + this.costoManoObra + this.costoIndirecto + costoMOExterna;

    next();
  } catch (error: any) {
    next(error);
  }
});

// Métodos virtuales
OrdenProduccionSchema.virtual('costoUnitario').get(function() {
  return this.unidadesProducidas > 0 ? this.costoTotal / this.unidadesProducidas : 0;
});

OrdenProduccionSchema.virtual('progreso').get(function() {
  // Validación defensiva: asegurar que materiasPrimas existe y es un array
  if (!this.materiasPrimas || !Array.isArray(this.materiasPrimas)) {
    return {
      totalNecesario: 0,
      totalReservado: 0,
      totalConsumido: 0,
      porcentajeReserva: 0,
      porcentajeConsumo: 0
    };
  }

  const totalNecesario = this.materiasPrimas.reduce((sum, mp) => sum + mp.cantidadNecesaria, 0);
  const totalReservado = this.materiasPrimas.reduce((sum, mp) => sum + mp.cantidadReservada, 0);
  const totalConsumido = this.materiasPrimas.reduce((sum, mp) => sum + mp.cantidadConsumida, 0);
  
  return {
    totalNecesario,
    totalReservado,
    totalConsumido,
    porcentajeReserva: totalNecesario > 0 ? (totalReservado / totalNecesario) * 100 : 0,
    porcentajeConsumo: totalNecesario > 0 ? (totalConsumido / totalNecesario) * 100 : 0
  };
});

OrdenProduccionSchema.virtual('tiempoProduccion').get(function() {
  if (this.fechaInicio && this.fechaFinalizacion) {
    return Math.round((this.fechaFinalizacion.getTime() - this.fechaInicio.getTime()) / (1000 * 60)); // minutos
  }
  return 0;
});

// Configurar toJSON para incluir virtuals
OrdenProduccionSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete (ret as any).__v;
    return ret;
  }
});

const OrdenProduccion = mongoose.model<IOrdenProduccion>('OrdenProduccion', OrdenProduccionSchema);

export default OrdenProduccion;
