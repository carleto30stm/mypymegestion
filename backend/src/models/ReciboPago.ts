import mongoose, { Document, Schema } from 'mongoose';

// Enums
export const MEDIOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'CUENTA_CORRIENTE'] as const;
export const ESTADOS_CHEQUE_COBRANZA = ['pendiente', 'depositado', 'cobrado', 'rechazado', 'en_cartera'] as const;
export const MOMENTO_COBRO = ['anticipado', 'contra_entrega', 'diferido'] as const;
export const ESTADOS_RECIBO = ['activo', 'anulado'] as const;

// Sub-interfaces
interface IDatosCheque {
  numeroCheque: string;
  bancoEmisor: string;
  fechaEmision: Date;
  fechaVencimiento: Date;
  titularCheque: string;
  cuitTitular?: string;
  estadoCheque: typeof ESTADOS_CHEQUE_COBRANZA[number];
  observaciones?: string;
  fechaDeposito?: Date;
  fechaCobro?: Date;
  fechaRechazo?: Date;
  motivoRechazo?: string;
}

interface IDatosTransferencia {
  numeroOperacion: string;
  banco: string;
  fechaTransferencia: Date;
  cuentaOrigen?: string;
  cuentaDestino?: string;
  observaciones?: string;
}

interface IDatosTarjeta {
  tipoTarjeta: 'debito' | 'credito';
  numeroAutorizacion?: string;
  lote?: string;
  cuotas?: number;
  marca?: 'VISA' | 'MASTERCARD' | 'AMEX' | 'CABAL' | 'NARANJA';
  ultimos4Digitos?: string;
  observaciones?: string;
}

interface IFormaPago {
  medioPago: typeof MEDIOS_PAGO[number];
  monto: number;
  banco?: string;
  datosCheque?: IDatosCheque;
  datosTransferencia?: IDatosTransferencia;
  datosTarjeta?: IDatosTarjeta;
  observaciones?: string;
}

interface IVentaRelacionada {
  ventaId: mongoose.Types.ObjectId;
  numeroVenta: string;
  montoOriginal: number;
  saldoAnterior: number;
  montoCobrado: number;
  saldoRestante: number;
}

interface ITotales {
  totalACobrar: number;
  totalCobrado: number;
  vuelto: number;
  saldoPendiente: number;
}

// Interface principal
export interface IReciboPago extends Document {
  numeroRecibo: string;
  fecha: Date;
  clienteId: mongoose.Types.ObjectId;
  nombreCliente: string;
  documentoCliente: string;
  ventasRelacionadas: IVentaRelacionada[];
  formasPago: IFormaPago[];
  totales: ITotales;
  momentoCobro: typeof MOMENTO_COBRO[number];
  estadoRecibo: typeof ESTADOS_RECIBO[number];
  observaciones?: string;
  motivoAnulacion?: string;
  fechaAnulacion?: Date;
  creadoPor: mongoose.Types.ObjectId;
  modificadoPor?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Schema para datos de cheque
const datosChequeSchema = new Schema({
  numeroCheque: { type: String, required: true },
  bancoEmisor: { type: String, required: true },
  fechaEmision: { type: Date, required: true },
  fechaVencimiento: { type: Date, required: true },
  titularCheque: { type: String, required: true },
  cuitTitular: { type: String },
  estadoCheque: { 
    type: String, 
    enum: ESTADOS_CHEQUE_COBRANZA,
    default: 'pendiente'
  },
  observaciones: { type: String },
  fechaDeposito: { type: Date },
  fechaCobro: { type: Date },
  fechaRechazo: { type: Date },
  motivoRechazo: { type: String }
}, { _id: false });

// Schema para datos de transferencia
const datosTransferenciaSchema = new Schema({
  numeroOperacion: { type: String, required: true },
  banco: { type: String, required: true },
  fechaTransferencia: { type: Date, required: true },
  cuentaOrigen: { type: String },
  cuentaDestino: { type: String },
  observaciones: { type: String }
}, { _id: false });

// Schema para datos de tarjeta
const datosTarjetaSchema = new Schema({
  tipoTarjeta: { 
    type: String, 
    enum: ['debito', 'credito'],
    required: true 
  },
  numeroAutorizacion: { type: String },
  lote: { type: String },
  cuotas: { type: Number, default: 1 },
  marca: { 
    type: String, 
    enum: ['VISA', 'MASTERCARD', 'AMEX', 'CABAL', 'NARANJA']
  },
  ultimos4Digitos: { type: String },
  observaciones: { type: String }
}, { _id: false });

// Schema para forma de pago
const formaPagoSchema = new Schema({
  medioPago: { 
    type: String, 
    enum: MEDIOS_PAGO,
    required: true 
  },
  monto: { 
    type: Number, 
    required: true,
    min: [0, 'El monto no puede ser negativo']
  },
  banco: { type: String },
  datosCheque: { type: datosChequeSchema },
  datosTransferencia: { type: datosTransferenciaSchema },
  datosTarjeta: { type: datosTarjetaSchema },
  observaciones: { type: String }
}, { _id: false });

// Schema para venta relacionada
const ventaRelacionadaSchema = new Schema({
  ventaId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Venta',
    required: true 
  },
  numeroVenta: { type: String, required: true },
  montoOriginal: { 
    type: Number, 
    required: true,
    min: 0
  },
  saldoAnterior: { 
    type: Number, 
    required: true,
    min: 0
  },
  montoCobrado: { 
    type: Number, 
    required: true,
    min: 0
  },
  saldoRestante: { 
    type: Number, 
    required: true,
    min: 0
  }
}, { _id: false });

// Schema para totales
const totalesSchema = new Schema({
  totalACobrar: { 
    type: Number, 
    required: true,
    min: 0
  },
  totalCobrado: { 
    type: Number, 
    required: true,
    min: 0
  },
  vuelto: { 
    type: Number, 
    default: 0,
    min: 0
  },
  saldoPendiente: { 
    type: Number, 
    default: 0,
    min: 0
  }
}, { _id: false });

// Schema principal de ReciboPago
const reciboPagoSchema = new Schema<IReciboPago>(
  {
    numeroRecibo: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true
      // No required: se genera automáticamente en el middleware pre-save
    },
    fecha: {
      type: Date,
      required: [true, 'La fecha es obligatoria'],
      default: Date.now
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
    ventasRelacionadas: {
      type: [ventaRelacionadaSchema],
      required: true,
      validate: {
        validator: function(v: IVentaRelacionada[]) {
          return v && v.length > 0;
        },
        message: 'Debe haber al menos una venta relacionada'
      }
    },
    formasPago: {
      type: [formaPagoSchema],
      required: true,
      validate: {
        validator: function(v: IFormaPago[]) {
          return v && v.length > 0;
        },
        message: 'Debe haber al menos una forma de pago'
      }
    },
    totales: {
      type: totalesSchema,
      required: true
    },
    momentoCobro: {
      type: String,
      enum: MOMENTO_COBRO,
      required: [true, 'El momento de cobro es obligatorio']
    },
    estadoRecibo: {
      type: String,
      enum: ESTADOS_RECIBO,
      default: 'activo'
    },
    observaciones: {
      type: String,
      trim: true
    },
    motivoAnulacion: {
      type: String,
      trim: true
    },
    fechaAnulacion: {
      type: Date
    },
    creadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El creador es obligatorio']
    },
    modificadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Índices para mejorar consultas
reciboPagoSchema.index({ clienteId: 1 });
reciboPagoSchema.index({ fecha: -1 });
reciboPagoSchema.index({ estadoRecibo: 1 });
reciboPagoSchema.index({ 'ventasRelacionadas.ventaId': 1 });
reciboPagoSchema.index({ momentoCobro: 1 });

// Middleware pre-save: generar número de recibo automáticamente
reciboPagoSchema.pre('save', async function (next) {
  if (this.isNew && !this.numeroRecibo) {
    try {
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const prefix = `REC-${year}${month}`;

      // Obtener la sesión si existe (para transacciones)
      const session = this.$session();
      
      const ReciboModel = mongoose.model('ReciboPago');
      const query = ReciboModel.findOne({
        numeroRecibo: new RegExp(`^${prefix}`)
      })
        .sort({ numeroRecibo: -1 })
        .limit(1);
      
      // Aplicar sesión si existe
      const ultimoRecibo = session 
        ? await query.session(session)
        : await query;

      let numeroSecuencial = 1;
      if (ultimoRecibo && ultimoRecibo.numeroRecibo) {
        const partes = ultimoRecibo.numeroRecibo.split('-');
        const ultimoNumero = partes[2] ? parseInt(partes[2]) : 0;
        numeroSecuencial = ultimoNumero + 1;
      }

      this.numeroRecibo = `${prefix}-${String(numeroSecuencial).padStart(4, '0')}`;
    } catch (error) {
      return next(error as Error);
    }
  }

  next();
});

// Middleware pre-save: validar totales
reciboPagoSchema.pre('save', function (next) {
  // Calcular total cobrado
  const totalCobrado = this.formasPago.reduce((sum, fp) => sum + fp.monto, 0);
  
  // Calcular total a cobrar
  const totalACobrar = this.ventasRelacionadas.reduce((sum, vr) => sum + vr.montoCobrado, 0);
  
  // Validar que coincida con totales
  if (Math.abs(this.totales.totalCobrado - totalCobrado) > 0.01) {
    return next(new Error(`El total cobrado (${totalCobrado}) no coincide con la suma de formas de pago`));
  }
  
  if (Math.abs(this.totales.totalACobrar - totalACobrar) > 0.01) {
    return next(new Error(`El total a cobrar (${totalACobrar}) no coincide con la suma de montos cobrados de ventas`));
  }
  
  // Calcular vuelto o saldo pendiente
  const diferencia = totalCobrado - totalACobrar;
  if (diferencia > 0) {
    this.totales.vuelto = diferencia;
    this.totales.saldoPendiente = 0;
  } else if (diferencia < 0) {
    this.totales.vuelto = 0;
    this.totales.saldoPendiente = Math.abs(diferencia);
  } else {
    this.totales.vuelto = 0;
    this.totales.saldoPendiente = 0;
  }
  
  next();
});

// Middleware pre-save: validar que cheques tengan datos completos
reciboPagoSchema.pre('save', function (next) {
  for (const formaPago of this.formasPago) {
    if (formaPago.medioPago === 'CHEQUE' && !formaPago.datosCheque) {
      return next(new Error('Los pagos con cheque deben incluir datos del cheque'));
    }
    
    if (formaPago.medioPago === 'TRANSFERENCIA' && !formaPago.datosTransferencia) {
      return next(new Error('Los pagos con transferencia deben incluir datos de la transferencia'));
    }
    
    if ((formaPago.medioPago === 'TARJETA_DEBITO' || formaPago.medioPago === 'TARJETA_CREDITO') && !formaPago.datosTarjeta) {
      return next(new Error('Los pagos con tarjeta deben incluir datos de la tarjeta'));
    }
  }
  
  next();
});

const ReciboPago = mongoose.model<IReciboPago>('ReciboPago', reciboPagoSchema);

export default ReciboPago;
