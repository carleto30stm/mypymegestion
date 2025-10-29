import mongoose from 'mongoose';

export interface IEmployee extends mongoose.Document {
  nombre: string;
  apellido: string;
  documento: string;
  puesto: string;
  fechaIngreso: string;
  sueldoBase: number;
  hora: number;
  estado: 'activo' | 'inactivo';
  email?: string;
  telefono?: string;
  observaciones?: string;
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
  observaciones: {
    type: String,
    trim: true,
    maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres']
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