import mongoose from 'mongoose';

export interface IObraSocial {
  nombre: string;
  numero?: string;
}

export interface IAdicionales {
  presentismo: boolean;
  zonaPeligrosa: boolean;
  otrosAdicionales?: { concepto: string; monto: number }[];
}

export interface IEmployee extends mongoose.Document {
  nombre: string;
  apellido: string;
  documento: string;
  puesto: string;
  fechaIngreso: string;
  sueldoBase: number;
  hora: number;
  estado: 'activo' | 'inactivo';
  modalidadContratacion: 'formal' | 'informal'; // Nueva: formal = con aportes, informal = en mano
  email?: string;
  telefono?: string;
  direccion?: string;
  fechaNacimiento?: string;
  observaciones?: string;
  categoria?: mongoose.Types.ObjectId;
  antiguedad?: number;
  // Campos argentinos
  cuit?: string;
  legajo?: string;
  cbu?: string;
  obraSocial?: IObraSocial;
  sindicato?: string;
  convenioId?: mongoose.Types.ObjectId;
  categoriaConvenio?: string;
  adicionales?: IAdicionales;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

const employeeSchema = new mongoose.Schema<IEmployee>({
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es requerido'],
    trim: true,
    maxlength: [50, 'El apellido no puede exceder 50 caracteres']
  },
  documento: {
    type: String,
    required: [true, 'El documento es requerido'],
    unique: true,
    trim: true,
    maxlength: [20, 'El documento no puede exceder 20 caracteres']
  },
  puesto: {
    type: String,
    required: [true, 'El puesto es requerido'],
    trim: true,
    maxlength: [100, 'El puesto no puede exceder 100 caracteres']
  },
  fechaIngreso: {
    type: String,
    required: [true, 'La fecha de ingreso es requerida']
  },
  sueldoBase: {
    type: Number,
    required: [true, 'El sueldo base es requerido'],
    min: [0, 'El sueldo base debe ser mayor a 0']
  },
  hora: {
    type: Number,
    required: [true, 'la hora es requerido'],
    min: [0, 'la hora debe ser mayor a 0']
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo'],
    default: 'activo'
  },
  modalidadContratacion: {
    type: String,
    enum: ['formal', 'informal'],
    default: 'informal' // Por defecto informal (pago en mano)
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function (v: string) {
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
    maxlength: [200, 'La dirección no puede exceder 200 caracteres']
  },
  fechaNacimiento: {
    type: String,
    trim: true
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres']
  },
  categoria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  antiguedad: {
    type: Number,
    default: 0
  },
  // Campos argentinos
  cuit: {
    type: String,
    trim: true,
    maxlength: [13, 'El CUIT no puede exceder 13 caracteres'],
    validate: {
      validator: function (v: string) {
        // Formato CUIT: XX-XXXXXXXX-X o sin guiones
        return !v || /^(\d{2}-\d{8}-\d{1}|\d{11})$/.test(v);
      },
      message: 'CUIT inválido. Formato: XX-XXXXXXXX-X'
    }
  },
  legajo: {
    type: String,
    trim: true,
    maxlength: [20, 'El legajo no puede exceder 20 caracteres']
  },
  cbu: {
    type: String,
    trim: true,
    maxlength: [22, 'El CBU no puede exceder 22 caracteres'],
    validate: {
      validator: function (v: string) {
        return !v || /^\d{22}$/.test(v);
      },
      message: 'CBU inválido. Debe tener 22 dígitos'
    }
  },
  obraSocial: {
    nombre: {
      type: String,
      trim: true,
      maxlength: [100, 'El nombre de la obra social no puede exceder 100 caracteres']
    },
    numero: {
      type: String,
      trim: true,
      maxlength: [20, 'El número de afiliado no puede exceder 20 caracteres']
    }
  },
  sindicato: {
    type: String,
    trim: true,
    maxlength: [100, 'El sindicato no puede exceder 100 caracteres']
  },
  convenioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Convenio'
  },
  categoriaConvenio: {
    type: String,
    trim: true,
    maxlength: [50, 'La categoría del convenio no puede exceder 50 caracteres']
  },
  adicionales: {
    presentismo: {
      type: Boolean,
      default: true
    },
    zonaPeligrosa: {
      type: Boolean,
      default: false
    },
    otrosAdicionales: [{
      concepto: {
        type: String,
        trim: true
      },
      monto: {
        type: Number,
        default: 0
      }
    }]
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
employeeSchema.index({ estado: 1 });
employeeSchema.index({ apellido: 1, nombre: 1 });

const Employee = mongoose.model<IEmployee>('Employee', employeeSchema);

export default Employee;