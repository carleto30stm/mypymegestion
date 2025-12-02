import mongoose, { Schema, Document } from 'mongoose';

// Interface para item de materia prima en receta
export interface IItemReceta {
  materiaPrimaId: mongoose.Types.ObjectId;
  codigoMateriaPrima: string;
  nombreMateriaPrima: string;
  cantidad: number; // Cantidad necesaria por unidad de producto
  unidadMedida: string;
  costo?: number; // Costo unitario al momento de crear/actualizar
}

// Interface para item de mano de obra en receta (operarios por categoría)
export interface IItemManoObra {
  categoriaId: mongoose.Types.ObjectId;
  nombreCategoria: string;
  cantidadOperarios: number; // Cantidad de operarios de esta categoría
  horasPorOperario: number; // Horas que trabaja cada operario en esta receta
  valorHora: number; // Valor hora al momento de crear/actualizar
  costoTotal?: number; // Calculado: cantidadOperarios * horasPorOperario * valorHora
}

// Interface para el documento de Receta
export interface IReceta extends Document {
  productoId: mongoose.Types.ObjectId;
  codigoProducto: string;
  nombreProducto: string;
  materiasPrimas: IItemReceta[];
  manoObra?: IItemManoObra[]; // Array de operarios por categoría
  rendimiento: number; // Cantidad de unidades que produce esta receta
  tiempoPreparacion: number; // Minutos
  costoMateriasPrimas: number; // Calculado automáticamente
  costoManoObra?: number; // Calculado desde manoObra[]
  costoIndirecto?: number;
  costoTotal: number;
  precioVentaSugerido?: number;
  margenBruto?: number; // Porcentaje
  estado: 'activa' | 'inactiva' | 'borrador';
  version: number;
  observaciones?: string;
  createdBy: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

const ItemRecetaSchema = new Schema<IItemReceta>({
  materiaPrimaId: {
    type: Schema.Types.ObjectId,
    ref: 'MateriaPrima',
    required: [true, 'El ID de materia prima es obligatorio']
  },
  codigoMateriaPrima: {
    type: String,
    required: [true, 'El código de materia prima es obligatorio']
  },
  nombreMateriaPrima: {
    type: String,
    required: [true, 'El nombre de materia prima es obligatorio']
  },
  cantidad: {
    type: Number,
    required: [true, 'La cantidad es obligatoria'],
    min: [0.001, 'La cantidad debe ser mayor a 0']
  },
  unidadMedida: {
    type: String,
    required: [true, 'La unidad de medida es obligatoria']
  },
  costo: {
    type: Number,
    min: [0, 'El costo no puede ser negativo']
  }
}, { _id: false });

// Schema para item de mano de obra
const ItemManoObraSchema = new Schema<IItemManoObra>({
  categoriaId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'El ID de categoría es obligatorio']
  },
  nombreCategoria: {
    type: String,
    required: [true, 'El nombre de categoría es obligatorio']
  },
  cantidadOperarios: {
    type: Number,
    required: [true, 'La cantidad de operarios es obligatoria'],
    min: [1, 'Debe haber al menos 1 operario']
  },
  horasPorOperario: {
    type: Number,
    required: [true, 'Las horas por operario son obligatorias'],
    min: [0.1, 'Las horas deben ser mayores a 0']
  },
  valorHora: {
    type: Number,
    required: [true, 'El valor hora es obligatorio'],
    min: [0, 'El valor hora no puede ser negativo']
  },
  costoTotal: {
    type: Number,
    min: [0, 'El costo no puede ser negativo']
  }
}, { _id: false });

const RecetaSchema = new Schema<IReceta>({
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
  materiasPrimas: {
    type: [ItemRecetaSchema],
    required: [true, 'Debe incluir al menos una materia prima'],
    validate: {
      validator: function(v: IItemReceta[]) {
        return v && v.length > 0;
      },
      message: 'La receta debe tener al menos una materia prima'
    }
  },
  manoObra: {
    type: [ItemManoObraSchema],
    default: []
  },
  rendimiento: {
    type: Number,
    required: [true, 'El rendimiento es obligatorio'],
    min: [1, 'El rendimiento debe ser al menos 1 unidad'],
    default: 1
  },
  tiempoPreparacion: {
    type: Number,
    required: [true, 'El tiempo de preparación es obligatorio'],
    min: [0, 'El tiempo no puede ser negativo'],
    default: 0
  },
  costoMateriasPrimas: {
    type: Number,
    default: 0,
    min: [0, 'El costo no puede ser negativo']
  },
  costoManoObra: {
    type: Number,
    min: [0, 'El costo de mano de obra no puede ser negativo'],
    default: 0
  },
  costoIndirecto: {
    type: Number,
    min: [0, 'El costo indirecto no puede ser negativo'],
    default: 0
  },
  costoTotal: {
    type: Number,
    default: 0,
    min: [0, 'El costo total no puede ser negativo']
  },
  precioVentaSugerido: {
    type: Number,
    min: [0, 'El precio de venta no puede ser negativo']
  },
  margenBruto: {
    type: Number,
    min: [0, 'El margen bruto no puede ser negativo'],
    max: [100, 'El margen bruto no puede superar el 100%']
  },
  estado: {
    type: String,
    enum: {
      values: ['activa', 'inactiva', 'borrador'],
      message: 'Estado inválido: {VALUE}'
    },
    default: 'borrador'
  },
  version: {
    type: Number,
    default: 1,
    min: [1, 'La versión debe ser al menos 1']
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [500, 'Las observaciones no pueden superar los 500 caracteres']
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
RecetaSchema.index({ productoId: 1 });
RecetaSchema.index({ codigoProducto: 1 });
RecetaSchema.index({ estado: 1 });
RecetaSchema.index({ productoId: 1, version: -1 }); // Para obtener última versión

// Middleware pre-save: calcular costos totales
RecetaSchema.pre('save', async function(next) {
  try {
    // Calcular costo de materias primas (con validación defensiva)
    if (this.materiasPrimas && Array.isArray(this.materiasPrimas)) {
      this.costoMateriasPrimas = this.materiasPrimas.reduce((total, item) => {
        return total + ((item.costo || 0) * item.cantidad);
      }, 0);
    } else {
      this.costoMateriasPrimas = 0;
    }

    // Calcular costo de mano de obra desde el array de operarios
    if (this.manoObra && Array.isArray(this.manoObra) && this.manoObra.length > 0) {
      this.costoManoObra = this.manoObra.reduce((total, item) => {
        // Calcular costo total de cada item y guardarlo
        const costoItem = (item.cantidadOperarios || 0) * (item.horasPorOperario || 0) * (item.valorHora || 0);
        item.costoTotal = costoItem;
        return total + costoItem;
      }, 0);
    }
    // Si no hay manoObra array pero hay costoManoObra manual, mantenerlo

    // Calcular costo total
    this.costoTotal = this.costoMateriasPrimas + 
                      (this.costoManoObra || 0) + 
                      (this.costoIndirecto || 0);

    // Calcular margen bruto si hay precio de venta
    if (this.precioVentaSugerido && this.precioVentaSugerido > 0 && this.costoTotal > 0) {
      const costoUnitario = this.costoTotal / this.rendimiento;
      this.margenBruto = ((this.precioVentaSugerido - costoUnitario) / this.precioVentaSugerido) * 100;
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

// Métodos virtuales
RecetaSchema.virtual('costoUnitario').get(function() {
  return this.rendimiento > 0 ? this.costoTotal / this.rendimiento : 0;
});

RecetaSchema.virtual('esRentable').get(function() {
  return this.margenBruto !== undefined && this.margenBruto > 0;
});

RecetaSchema.virtual('necesitaActualizacion').get(function() {
  // Verificar si alguna materia prima no tiene costo actualizado (con validación defensiva)
  if (!this.materiasPrimas || !Array.isArray(this.materiasPrimas)) {
    return false;
  }
  return this.materiasPrimas.some(item => !item.costo || item.costo === 0);
});

// Configurar toJSON para incluir virtuals
RecetaSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete (ret as any).__v;
    return ret;
  }
});

const Receta = mongoose.model<IReceta>('Receta', RecetaSchema);

export default Receta;
