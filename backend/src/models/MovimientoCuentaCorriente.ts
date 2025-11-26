import mongoose, { Document } from 'mongoose';

// Tipos de movimiento
export const TIPOS_MOVIMIENTO = [
  'venta',
  'recibo',
  'nota_credito',
  'nota_debito',
  'ajuste_cargo',
  'ajuste_descuento'
] as const;

export type TipoMovimiento = typeof TIPOS_MOVIMIENTO[number];

// Interface para el movimiento
export interface IMovimientoCuentaCorriente extends Document {
  clienteId: mongoose.Types.ObjectId;
  fecha: Date;
  tipo: TipoMovimiento;
  
  // Referencia al documento origen
  documentoTipo: string; // 'VENTA', 'RECIBO', 'NC', 'ND', 'AJUSTE'
  documentoNumero: string;
  documentoId?: mongoose.Types.ObjectId; // ID del documento relacionado (venta, recibo, etc)
  
  // Descripción del movimiento
  concepto: string;
  observaciones?: string;
  
  // Importes contables
  debe: number; // Incrementa deuda del cliente (ventas, notas de débito, ajustes cargo)
  haber: number; // Reduce deuda del cliente (cobros, notas de crédito, ajustes descuento)
  saldo: number; // Saldo después de este movimiento
  
  // Metadatos
  creadoPor?: string; // Username del usuario que creó el movimiento
  anulado: boolean;
  fechaAnulacion?: Date;
  motivoAnulacion?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const movimientoCuentaCorrienteSchema = new mongoose.Schema<IMovimientoCuentaCorriente>({
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: [true, 'El cliente es requerido'],
    index: true
  },
  fecha: {
    type: Date,
    required: [true, 'La fecha es requerida'],
    index: true
  },
  tipo: {
    type: String,
    enum: TIPOS_MOVIMIENTO,
    required: [true, 'El tipo de movimiento es requerido'],
    index: true
  },
  documentoTipo: {
    type: String,
    required: [true, 'El tipo de documento es requerido'],
    uppercase: true,
    trim: true
  },
  documentoNumero: {
    type: String,
    required: [true, 'El número de documento es requerido'],
    trim: true
  },
  documentoId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'documentoTipo' // Referencia dinámica según tipo
  },
  concepto: {
    type: String,
    required: [true, 'El concepto es requerido'],
    trim: true,
    maxlength: [500, 'El concepto no puede exceder 500 caracteres']
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las observaciones no pueden exceder 1000 caracteres']
  },
  debe: {
    type: Number,
    required: true,
    min: [0, 'El debe no puede ser negativo'],
    default: 0
  },
  haber: {
    type: Number,
    required: true,
    min: [0, 'El haber no puede ser negativo'],
    default: 0
  },
  saldo: {
    type: Number,
    required: true
  },
  creadoPor: {
    type: String, // Username del usuario que creó el movimiento
    trim: true
  },
  anulado: {
    type: Boolean,
    default: false,
    index: true
  },
  fechaAnulacion: {
    type: Date
  },
  motivoAnulacion: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Índices compuestos para queries eficientes
movimientoCuentaCorrienteSchema.index({ clienteId: 1, fecha: -1 }); // Listar movimientos por cliente
movimientoCuentaCorrienteSchema.index({ clienteId: 1, tipo: 1, fecha: -1 }); // Filtrar por tipo
movimientoCuentaCorrienteSchema.index({ clienteId: 1, anulado: 1, fecha: -1 }); // Excluir anulados
movimientoCuentaCorrienteSchema.index({ documentoId: 1 }); // Buscar por documento origen

// Validación: debe o haber debe tener valor (no ambos en 0)
movimientoCuentaCorrienteSchema.pre('save', function(next) {
  if (this.debe === 0 && this.haber === 0) {
    next(new Error('El movimiento debe tener un importe en debe o haber'));
  }
  next();
});

const MovimientoCuentaCorriente = mongoose.model<IMovimientoCuentaCorriente>(
  'MovimientoCuentaCorriente',
  movimientoCuentaCorrienteSchema
);

export default MovimientoCuentaCorriente;
