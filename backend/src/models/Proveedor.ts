import mongoose, { Document } from 'mongoose';

export interface IProveedor extends Document {
  tipoDocumento: 'DNI' | 'CUIT' | 'CUIL' | 'Pasaporte';
  numeroDocumento: string;
  razonSocial: string;
  nombreContacto?: string;
  email?: string;
  telefono?: string;
  telefonoAlt?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  codigoPostal?: string;
  condicionIVA: 'Responsable Inscripto' | 'Monotributista' | 'Exento' | 'Consumidor Final';
  saldoCuenta: number; // Positivo = debemos al proveedor, negativo = anticipo
  limiteCredito: number; // Crédito que nos otorga el proveedor
  categorias: string[]; // Tipos de productos que vende (ej: ['Materia Prima', 'Embalaje'])
  diasPago?: number; // Días de plazo de pago (30, 60, 90)
  estado: 'activo' | 'inactivo' | 'bloqueado';
  calificacion?: number; // 1-5 estrellas
  observaciones?: string;
  banco?: string; // Banco para transferencias
  cbu?: string;
  alias?: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  ultimaCompra?: Date;
  // Notas e incidentes
  notas?: Array<{
    texto: string;
    tipo: 'incidente' | 'problema' | 'observacion' | 'seguimiento';
    creadoPor: string;
    fechaCreacion: Date;
  }>;
}

const proveedorSchema = new mongoose.Schema<IProveedor>({
  tipoDocumento: {
    type: String,
    required: [true, 'El tipo de documento es requerido'],
    enum: ['DNI', 'CUIT', 'CUIL', 'Pasaporte'],
    default: 'CUIT'
  },
  numeroDocumento: {
    type: String,
    required: [true, 'El número de documento es requerido'],
    unique: true,
    trim: true,
    maxlength: [20, 'El número de documento no puede exceder 20 caracteres']
  },
  razonSocial: {
    type: String,
    required: [true, 'La razón social es requerida'],
    trim: true,
    maxlength: [200, 'La razón social no puede exceder 200 caracteres']
  },
  nombreContacto: {
    type: String,
    trim: true,
    maxlength: [150, 'El nombre de contacto no puede exceder 150 caracteres']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Email inválido'
    }
  },
  telefono: {
    type: String,
    trim: true,
    maxlength: [20, 'El teléfono no puede exceder 20 caracteres']
  },
  telefonoAlt: {
    type: String,
    trim: true,
    maxlength: [20, 'El teléfono alternativo no puede exceder 20 caracteres']
  },
  direccion: {
    type: String,
    trim: true,
    maxlength: [300, 'La dirección no puede exceder 300 caracteres']
  },
  ciudad: {
    type: String,
    trim: true,
    maxlength: [100, 'La ciudad no puede exceder 100 caracteres']
  },
  provincia: {
    type: String,
    trim: true,
    maxlength: [100, 'La provincia no puede exceder 100 caracteres']
  },
  codigoPostal: {
    type: String,
    trim: true,
    maxlength: [10, 'El código postal no puede exceder 10 caracteres']
  },
  condicionIVA: {
    type: String,
    required: [true, 'La condición de IVA es requerida'],
    enum: ['Responsable Inscripto', 'Monotributista', 'Exento', 'Consumidor Final'],
    default: 'Responsable Inscripto'
  },
  saldoCuenta: {
    type: Number,
    default: 0,
    // Positivo = debemos al proveedor, negativo = anticipo nuestro
  },
  limiteCredito: {
    type: Number,
    default: 0,
    min: [0, 'El límite de crédito debe ser mayor o igual a 0']
  },
  categorias: {
    type: [String],
    default: []
  },
  diasPago: {
    type: Number,
    min: [0, 'Los días de pago deben ser mayor o igual a 0'],
    default: 30
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo', 'bloqueado'],
    default: 'activo'
  },
  calificacion: {
    type: Number,
    min: [1, 'La calificación mínima es 1'],
    max: [5, 'La calificación máxima es 5']
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las observaciones no pueden exceder 1000 caracteres']
  },
  banco: {
    type: String,
    trim: true,
    maxlength: [100, 'El banco no puede exceder 100 caracteres']
  },
  cbu: {
    type: String,
    trim: true,
    maxlength: [22, 'El CBU no puede exceder 22 caracteres']
  },
  alias: {
    type: String,
    trim: true,
    maxlength: [50, 'El alias no puede exceder 50 caracteres']
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  ultimaCompra: {
    type: Date
  }
  ,
  // Notas e incidentes
  notas: [{
    texto: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'El texto de la nota no puede exceder 1000 caracteres']
    },
    tipo: {
      type: String,
      required: true,
      enum: ['incidente', 'problema', 'observacion', 'seguimiento'],
      default: 'observacion'
    },
    creadoPor: {
      type: String,
      required: true,
      trim: true
    },
    fechaCreacion: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: {
    createdAt: 'fechaCreacion',
    updatedAt: 'fechaActualizacion'
  }
});

// Índices para búsqueda eficiente
proveedorSchema.index({ razonSocial: 1 });
proveedorSchema.index({ estado: 1 });
proveedorSchema.index({ categorias: 1 });
proveedorSchema.index({ email: 1 });

// Método virtual para verificar si tenemos saldo pendiente
proveedorSchema.virtual('tieneSaldoPendiente').get(function(this: IProveedor) {
  return this.saldoCuenta > 0;
});

// Método virtual para verificar si podemos seguir comprando a crédito
proveedorSchema.virtual('puedeComprarCredito').get(function(this: IProveedor) {
  return this.estado === 'activo' && this.saldoCuenta < this.limiteCredito;
});

// Asegurar que los virtuales se incluyan en JSON
proveedorSchema.set('toJSON', { virtuals: true });
proveedorSchema.set('toObject', { virtuals: true });

const Proveedor = mongoose.model<IProveedor>('Proveedor', proveedorSchema);

export default Proveedor;
