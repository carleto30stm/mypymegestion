import mongoose, { Document } from 'mongoose';

export interface ICliente extends Document {
  tipoDocumento: 'DNI' | 'CUIT' | 'CUIL' | 'Pasaporte';
  numeroDocumento: string;
  razonSocial?: string;
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  codigoPostal?: string;
  condicionIVA: 'Responsable Inscripto' | 'Monotributista' | 'Exento' | 'Consumidor Final';
  saldoCuenta: number; // Para cuenta corriente
  limiteCredito: number;
  estado: 'activo' | 'inactivo' | 'moroso';
  observaciones?: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  ultimaCompra?: Date;
}

const clienteSchema = new mongoose.Schema<ICliente>({
  tipoDocumento: {
    type: String,
    required: [true, 'El tipo de documento es requerido'],
    enum: ['DNI', 'CUIT', 'CUIL', 'Pasaporte'],
    default: 'DNI'
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
    trim: true,
    maxlength: [200, 'La razón social no puede exceder 200 caracteres']
  },
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  apellido: {
    type: String,
    trim: true,
    maxlength: [100, 'El apellido no puede exceder 100 caracteres']
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
    default: 'Consumidor Final'
  },
  saldoCuenta: {
    type: Number,
    default: 0,
    // Positivo = cliente debe, negativo = a favor del cliente
  },
  limiteCredito: {
    type: Number,
    default: 0,
    min: [0, 'El límite de crédito debe ser mayor o igual a 0']
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo', 'moroso'],
    default: 'activo'
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las observaciones no pueden exceder 1000 caracteres']
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
}, {
  timestamps: {
    createdAt: 'fechaCreacion',
    updatedAt: 'fechaActualizacion'
  }
});

// Índices para búsqueda eficiente
clienteSchema.index({ nombre: 1, apellido: 1 });
clienteSchema.index({ razonSocial: 1 });
clienteSchema.index({ estado: 1 });
clienteSchema.index({ email: 1 });

// Método virtual para obtener nombre completo
clienteSchema.virtual('nombreCompleto').get(function(this: ICliente) {
  if (this.razonSocial) {
    return this.razonSocial;
  }
  return this.apellido ? `${this.apellido}, ${this.nombre}` : this.nombre;
});

// Método virtual para verificar si puede comprar a crédito
clienteSchema.virtual('puedeComprarCredito').get(function(this: ICliente) {
  return this.estado === 'activo' && this.saldoCuenta < this.limiteCredito;
});

// Asegurar que los virtuales se incluyan en JSON
clienteSchema.set('toJSON', { virtuals: true });
clienteSchema.set('toObject', { virtuals: true });

const Cliente = mongoose.model<ICliente>('Cliente', clienteSchema);

export default Cliente;
