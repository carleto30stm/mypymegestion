import mongoose, { Schema, Document } from 'mongoose';

// Interface para resumen de horas extra en liquidación
export interface IHoraExtraResumen {
  horaExtraId: string;
  fecha: Date;
  cantidadHoras: number;
  valorHora: number;
  montoTotal: number;
  descripcion?: string;
}

// Interface para liquidación individual de empleado
export interface ILiquidacionEmpleado {
  empleadoId: mongoose.Types.ObjectId;
  empleadoNombre: string;
  empleadoApellido: string;
  sueldoBase: number;
  horasExtra: IHoraExtraResumen[];
  totalHorasExtra: number;
  adelantos: number;
  aguinaldos: number;
  bonus: number;
  descuentos: number;
  totalAPagar: number;
  estado: 'pendiente' | 'pagado' | 'cancelado';
  gastosRelacionados: mongoose.Types.ObjectId[];
  reciboGenerado?: string;
  fechaPago?: Date;
  observaciones?: string;
  // Información de pago
  medioDePago?: 'Cheque Tercero' | 'Cheque Propio' | 'Efectivo' | 'Transferencia' | 'Tarjeta Débito' | 'Tarjeta Crédito' | 'Reserva' | 'Otro';
  banco?: 'PROVINCIA' | 'SANTANDER' | 'EFECTIVO' | 'FCI' | 'RESERVA';
}

// Interface principal del período de liquidación
export interface ILiquidacionPeriodo extends Document {
  nombre: string;
  fechaInicio: Date;
  fechaFin: Date;
  tipo: 'quincenal' | 'mensual';
  estado: 'abierto' | 'en_revision' | 'cerrado';
  liquidaciones: ILiquidacionEmpleado[];
  totalGeneral: number;
  fechaCierre?: Date;
  cerradoPor?: string;
  observaciones?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HoraExtraResumenSchema = new Schema({
  horaExtraId: { type: String, required: true },
  fecha: { type: Date, required: true },
  cantidadHoras: { type: Number, required: true },
  valorHora: { type: Number, required: true },
  montoTotal: { type: Number, required: true },
  descripcion: { type: String }
});

const LiquidacionEmpleadoSchema = new Schema({
  empleadoId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  empleadoNombre: { type: String, required: true },
  empleadoApellido: { type: String, required: true },
  sueldoBase: { type: Number, required: true },
  horasExtra: [HoraExtraResumenSchema],
  totalHorasExtra: { type: Number, default: 0 },
  adelantos: { type: Number, default: 0 },
  aguinaldos: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  descuentos: { type: Number, default: 0 },
  totalAPagar: { type: Number, required: true },
  estado: {
    type: String,
    enum: ['pendiente', 'pagado', 'cancelado'],
    default: 'pendiente'
  },
  gastosRelacionados: [{ type: Schema.Types.ObjectId, ref: 'Gasto' }],
  reciboGenerado: { type: String },
  fechaPago: { type: Date },
  observaciones: { type: String },
  medioDePago: {
    type: String,
    enum: ['Cheque Tercero', 'Cheque Propio', 'Efectivo', 'Transferencia', 'Tarjeta Débito', 'Tarjeta Crédito', 'Reserva', 'Otro']
  },
  banco: {
    type: String,
    enum: ['PROVINCIA', 'SANTANDER', 'EFECTIVO', 'FCI', 'RESERVA']
  }
});

const LiquidacionPeriodoSchema = new Schema({
  nombre: { type: String, required: true },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  tipo: {
    type: String,
    enum: ['quincenal', 'mensual'],
    required: true
  },
  estado: {
    type: String,
    enum: ['abierto', 'en_revision', 'cerrado'],
    default: 'abierto'
  },
  liquidaciones: [LiquidacionEmpleadoSchema],
  totalGeneral: { type: Number, default: 0 },
  fechaCierre: { type: Date },
  cerradoPor: { type: String },
  observaciones: { type: String }
}, {
  timestamps: true
});

// Middleware para calcular total general antes de guardar
LiquidacionPeriodoSchema.pre('save', function(next) {
  this.totalGeneral = this.liquidaciones.reduce((sum, liq) => sum + liq.totalAPagar, 0);
  next();
});

// Índices para búsquedas eficientes
LiquidacionPeriodoSchema.index({ fechaInicio: 1, fechaFin: 1 });
LiquidacionPeriodoSchema.index({ estado: 1 });
LiquidacionPeriodoSchema.index({ tipo: 1 });

export default mongoose.model<ILiquidacionPeriodo>('LiquidacionPeriodo', LiquidacionPeriodoSchema);
