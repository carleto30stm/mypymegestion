import mongoose, { Document, Schema } from 'mongoose';

// Interface para TypeScript
export interface IRemito extends Document {
  numeroRemito: string;
  fecha: Date;
  ventaId: mongoose.Types.ObjectId;
  clienteId: mongoose.Types.ObjectId;
  nombreCliente: string;
  documentoCliente: string;
  direccionEntrega: string;
  items: {
    productoId: mongoose.Types.ObjectId;
    codigoProducto: string;
    nombreProducto: string;
    cantidadSolicitada: number;
    cantidadEntregada: number;
    observacion?: string;
  }[];
  estado: 'pendiente' | 'en_transito' | 'entregado' | 'devuelto' | 'cancelado';
  repartidor?: string;
  numeroBultos?: string;
  medioEnvio?: string;
  horaDespacho?: Date;
  horaEntrega?: Date;
  nombreReceptor?: string;
  dniReceptor?: string;
  firmaDigital?: string;
  observaciones?: string;
  motivoCancelacion?: string;
  creadoPor: string;
  modificadoPor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const remitoSchema = new Schema<IRemito>(
  {
    numeroRemito: {
      type: String,
      required: [true, 'El número de remito es obligatorio'],
      unique: true,
      trim: true,
      uppercase: true
    },
    fecha: {
      type: Date,
      required: [true, 'La fecha es obligatoria'],
      default: Date.now
    },
    ventaId: {
      type: Schema.Types.ObjectId,
      ref: 'Venta',
      required: [true, 'La venta asociada es obligatoria']
    },
    clienteId: {
      type: Schema.Types.ObjectId,
      ref: 'Cliente',
      required: [true, 'El cliente es obligatorio']
    },
    nombreCliente: {
      type: String,
      required: [true, 'El nombre del cliente es obligatorio'],
      trim: true
    },
    documentoCliente: {
      type: String,
      required: [true, 'El documento del cliente es obligatorio'],
      trim: true
    },
    direccionEntrega: {
      type: String,
      required: [true, 'La dirección de entrega es obligatoria'],
      trim: true,
      maxlength: [500, 'La dirección no puede exceder 500 caracteres']
    },
    items: [
      {
        productoId: {
          type: Schema.Types.ObjectId,
          ref: 'Producto',
          required: true
        },
        codigoProducto: {
          type: String,
          required: true,
          trim: true
        },
        nombreProducto: {
          type: String,
          required: true,
          trim: true
        },
        cantidadSolicitada: {
          type: Number,
          required: true,
          min: [0, 'La cantidad solicitada no puede ser negativa']
        },
        cantidadEntregada: {
          type: Number,
          required: true,
          min: [0, 'La cantidad entregada no puede ser negativa'],
          validate: {
            validator: function(this: any, value: number) {
              return value <= this.cantidadSolicitada;
            },
            message: 'La cantidad entregada no puede exceder la solicitada'
          }
        },
        observacion: {
          type: String,
          trim: true,
          maxlength: [200, 'La observación no puede exceder 200 caracteres']
        }
      }
    ],
    estado: {
      type: String,
      enum: {
        values: ['pendiente', 'en_transito', 'entregado', 'devuelto', 'cancelado'],
        message: '{VALUE} no es un estado válido'
      },
      default: 'pendiente',
      required: true
    },
    repartidor: {
      type: String,
      trim: true,
      maxlength: [100, 'El nombre del repartidor no puede exceder 100 caracteres']
    },
    numeroBultos: {
      type: String,
      trim: true,
      maxlength: [20, 'El número de bultos no puede exceder 20 caracteres']
    },
    medioEnvio: {
      type: String,
      trim: true,
      maxlength: [50, 'El medio de envío no puede exceder 50 caracteres']
    },
    horaDespacho: {
      type: Date
    },
    horaEntrega: {
      type: Date,
      validate: {
        validator: function(this: IRemito, value: Date) {
          if (!value || !this.horaDespacho) return true;
          return value >= this.horaDespacho;
        },
        message: 'La hora de entrega no puede ser anterior a la de despacho'
      }
    },
    nombreReceptor: {
      type: String,
      trim: true,
      maxlength: [100, 'El nombre del receptor no puede exceder 100 caracteres']
    },
    dniReceptor: {
      type: String,
      trim: true,
      maxlength: [20, 'El DNI del receptor no puede exceder 20 caracteres']
    },
    firmaDigital: {
      type: String, // Base64 de la firma
      trim: true
    },
    observaciones: {
      type: String,
      trim: true,
      maxlength: [1000, 'Las observaciones no pueden exceder 1000 caracteres']
    },
    motivoCancelacion: {
      type: String,
      trim: true,
      maxlength: [500, 'El motivo de cancelación no puede exceder 500 caracteres']
    },
    creadoPor: {
      type: String,
      required: [true, 'El creador es obligatorio'],
      trim: true
    },
    modificadoPor: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Índices para mejorar consultas
remitoSchema.index({ ventaId: 1 });
remitoSchema.index({ clienteId: 1 });
remitoSchema.index({ estado: 1 });
remitoSchema.index({ fecha: -1 });
remitoSchema.index({ repartidor: 1 });

// Middleware pre-save: generar número de remito automáticamente
remitoSchema.pre('save', async function (next) {
  if (this.isNew && !this.numeroRemito) {
    try {
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const prefix = `REM-${year}${month}`;

      // Buscar el último remito del mes
      const RemitoModel = mongoose.model('Remito');
      
      // Obtener la sesión si existe (para transacciones)
      const session = this.$session();
      
      const query = RemitoModel.findOne({
        numeroRemito: new RegExp(`^${prefix}`)
      })
        .sort({ numeroRemito: -1 })
        .limit(1);
      
      // Aplicar sesión si existe
      const ultimoRemito = session 
        ? await query.session(session)
        : await query;

      let numeroSecuencial = 1;
      if (ultimoRemito && ultimoRemito.numeroRemito) {
        const ultimoNumero = parseInt(ultimoRemito.numeroRemito.split('-')[2]);
        numeroSecuencial = ultimoNumero + 1;
      }

      this.numeroRemito = `${prefix}-${String(numeroSecuencial).padStart(4, '0')}`;
    } catch (error) {
      return next(error as Error);
    }
  }

  next();
});

// Middleware pre-save: validar cambios de estado
remitoSchema.pre('save', async function (next) {
  if (!this.isNew && this.isModified('estado')) {
    const estadosValidos: Record<string, string[]> = {
      pendiente: ['en_transito', 'cancelado'],
      en_transito: ['entregado', 'devuelto', 'cancelado'],
      entregado: [], // Estado final, no permite cambios
      devuelto: ['pendiente'], // Puede volver a intentarse
      cancelado: [] // Estado final, no permite cambios
    };

    // Obtener el documento original desde la base de datos
    const RemitoModel = mongoose.model('Remito');
    const docOriginal = await RemitoModel.findById(this._id).select('estado').session(this.$session());
    const estadoAnterior = docOriginal?.estado || 'pendiente';
    const estadoNuevo = this.estado;
    const estadosPermitidos = estadosValidos[estadoAnterior] || [];

    if (!estadosPermitidos.includes(estadoNuevo)) {
      return next(new Error(
        `No se puede cambiar de estado "${estadoAnterior}" a "${estadoNuevo}". Estados permitidos desde "${estadoAnterior}": ${estadosPermitidos.join(', ') || 'ninguno'}`
      ));
    }

    // Validaciones específicas por estado
    if (this.estado === 'en_transito' && !this.horaDespacho) {
      this.horaDespacho = new Date();
    }

    if (this.estado === 'entregado') {
      if (!this.horaEntrega) {
        this.horaEntrega = new Date();
      }
      if (!this.nombreReceptor) {
        return next(new Error('El nombre del receptor es obligatorio para confirmar la entrega'));
      }
    }

    if (this.estado === 'cancelado' && !this.motivoCancelacion) {
      return next(new Error('El motivo de cancelación es obligatorio'));
    }
  }

  next();
});

const Remito = mongoose.model<IRemito>('Remito', remitoSchema);

export default Remito;
