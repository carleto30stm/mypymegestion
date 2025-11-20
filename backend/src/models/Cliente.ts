import mongoose, { Document } from 'mongoose';

export interface ICliente extends Document {
  tipoDocumento: 'DNI' | 'CUIT' | 'CUIL' | 'Pasaporte';
  numeroDocumento: string;
  razonSocial?: string;
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  telefonoAlt?: string;
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
  
  // Campos para facturación fiscal
  requiereFacturaAFIP: boolean;
  aplicaIVA: boolean;
  facturacionAutomatica?: boolean; // Si true, auto-generar factura al cobrar (Fase 2)
  
  // Campos para entregas
  direccionEntrega?: string;
  direccionesAlternativas?: Array<{
    alias: string;
    direccion: string;
    ciudad?: string;
    referencia?: string;
    contacto?: string;
    telefono?: string;
  }>;
  
  // Preferencias de pago
  aceptaCheques: boolean;
  diasVencimientoCheques?: number;
  
  // Notas e incidentes
  notas?: Array<{
    texto: string;
    tipo: 'incidente' | 'problema' | 'observacion' | 'seguimiento';
    creadoPor: string;
    fechaCreacion: Date;
  }>;
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
    maxlength: [20, 'El número de documento no puede exceder 20 caracteres'],
    validate: {
      validator: function(this: ICliente, v: string) {
        const tipo = this.tipoDocumento;
        const soloNumeros = v.replace(/[^0-9]/g, '');
        
        // CUIT/CUIL debe tener exactamente 11 dígitos
        if (tipo === 'CUIT' || tipo === 'CUIL') {
          return soloNumeros.length === 11;
        }
        
        // DNI debe tener entre 7 y 8 dígitos
        if (tipo === 'DNI') {
          return soloNumeros.length >= 7 && soloNumeros.length <= 8;
        }
        
        // Pasaporte es flexible (cualquier formato)
        return true;
      },
      message: 'Formato de documento inválido: CUIT/CUIL requiere 11 dígitos, DNI requiere 7-8 dígitos'
    }
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
    required: function(this: ICliente) {
      return this.requiereFacturaAFIP;
    },
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Email inválido - requerido para envío de facturas electrónicas'
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
    required: function(this: ICliente) {
      return this.requiereFacturaAFIP;
    },
    trim: true,
    maxlength: [300, 'La dirección no puede exceder 300 caracteres']
  },
  ciudad: {
    type: String,
    required: function(this: ICliente) {
      return this.requiereFacturaAFIP;
    },
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
    required: function(this: ICliente) {
      return this.requiereFacturaAFIP && this.condicionIVA !== 'Responsable Inscripto';
    },
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
  },
  // Campos para facturación fiscal
  requiereFacturaAFIP: {
    type: Boolean,
    default: false,
    required: true
  },
  aplicaIVA: {
    type: Boolean,
    default: true,
    required: true
  },
  facturacionAutomatica: {
    type: Boolean,
    default: false, // Por defecto, facturación manual (Fase 2)
    index: true
  },
  // Campos para entregas
  direccionEntrega: {
    type: String,
    trim: true,
    maxlength: [300, 'La dirección de entrega no puede exceder 300 caracteres']
  },
  direccionesAlternativas: [{
    alias: {
      type: String,
      trim: true,
      maxlength: [50, 'El alias no puede exceder 50 caracteres']
    },
    direccion: {
      type: String,
      trim: true,
      required: true,
      maxlength: [300, 'La dirección no puede exceder 300 caracteres']
    },
    ciudad: {
      type: String,
      trim: true,
      maxlength: [100, 'La ciudad no puede exceder 100 caracteres']
    },
    referencia: {
      type: String,
      trim: true,
      maxlength: [200, 'La referencia no puede exceder 200 caracteres']
    },
    contacto: {
      type: String,
      trim: true,
      maxlength: [100, 'El contacto no puede exceder 100 caracteres']
    },
    telefono: {
      type: String,
      trim: true,
      maxlength: [20, 'El teléfono no puede exceder 20 caracteres']
    }
  }],
  // Preferencias de pago
  aceptaCheques: {
    type: Boolean,
    default: true
  },
  diasVencimientoCheques: {
    type: Number,
    min: [0, 'Los días de vencimiento deben ser mayor o igual a 0'],
    max: [365, 'Los días de vencimiento no pueden exceder 365'],
    default: 30
  },
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

// Middleware pre-save: Validaciones AFIP para producción
clienteSchema.pre('save', function(next) {
  const cliente = this as ICliente;
  
  // Solo validar si requiere factura AFIP
  if (cliente.requiereFacturaAFIP) {
    const errores: string[] = [];
    
    // Validar CUIT formato correcto (11 dígitos sin guiones ni puntos)
    if (cliente.tipoDocumento === 'CUIT' || cliente.tipoDocumento === 'CUIL') {
      const cuitLimpio = cliente.numeroDocumento.replace(/[^0-9]/g, '');
      if (cuitLimpio.length !== 11) {
        errores.push(`${cliente.tipoDocumento} debe tener exactamente 11 dígitos`);
      }
    }
    
    // Validar razón social o nombre completo
    if (!cliente.razonSocial && !cliente.nombre) {
      errores.push('Debe tener razón social o nombre para facturación');
    }
    
    // Advertencias (no bloquean guardado, solo logean)
    if (!cliente.email) {
      console.warn(`⚠️  Cliente ${cliente.numeroDocumento} sin email - no se podrá enviar factura electrónica`);
    }
    
    if (!cliente.telefono) {
      console.warn(`⚠️  Cliente ${cliente.numeroDocumento} sin teléfono de contacto`);
    }
    
    // Si hay errores críticos, rechazar guardado
    if (errores.length > 0) {
      return next(new Error(`Datos AFIP incompletos: ${errores.join(', ')}. Verifique los campos requeridos para facturación electrónica.`));
    }
  }
  
  next();
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
