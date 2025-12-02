import mongoose, { Schema, Document } from 'mongoose';
import { MEDIO_PAGO, CAJAS } from '../Types/Types.js';

// Tipos de baja/egreso
export const TIPOS_BAJA = [
  'renuncia',           // Renuncia voluntaria del empleado
  'despido_con_causa',  // Despido con justa causa (no paga indemnización)
  'despido_sin_causa',  // Despido sin causa (paga indemnización + preaviso)
  'mutuo_acuerdo',      // Extinción por mutuo acuerdo
  'jubilacion',         // Jubilación del empleado
  'fallecimiento',      // Fallecimiento del empleado
  'fin_contrato',       // Fin de contrato a plazo fijo
  'periodo_prueba'      // Durante período de prueba
] as const;

export type TipoBaja = typeof TIPOS_BAJA[number];

// Interface para el detalle de cálculos
export interface IDetalleCalculo {
  concepto: string;
  descripcion: string;
  diasBase?: number;
  valorDiario?: number;
  porcentaje?: number;
  monto: number;
}

// Interface principal de Liquidación Final
export interface ILiquidacionFinal extends Document {
  empleadoId: mongoose.Types.ObjectId;
  empleadoNombre: string;
  empleadoApellido: string;
  empleadoDocumento: string;
  empleadoCuit?: string;
  
  // Datos del empleo
  fechaIngreso: Date;
  fechaEgreso: Date;
  antiguedadAnios: number;
  antiguedadMeses: number;
  antiguedadDias: number;
  sueldoBase: number;
  mejorRemuneracion: number; // Mejor remuneración mensual, normal y habitual (para indemnización)
  
  // Tipo de baja
  tipoBaja: TipoBaja;
  motivoBaja?: string;
  
  // Desglose de conceptos (todos calculados según ley argentina)
  diasTrabajadosMes: number;
  salarioProporcional: number;        // Días trabajados del mes en curso
  
  // Vacaciones proporcionales (Art. 156 LCT)
  diasVacacionesCorrespondientes: number;
  diasVacacionesGozadas: number;
  diasVacacionesPendientes: number;
  vacacionesProporcionales: number;
  plusVacacional: number;              // 25% adicional sobre vacaciones
  
  // SAC proporcional (Art. 123 LCT)
  mesesTrabajadosSemestre: number;
  sacProporcional: number;
  
  // Indemnización por antigüedad (Art. 245 LCT) - Solo despido sin causa
  aplicaIndemnizacion: boolean;
  baseIndemnizacion: number;           // Mejor remuneración (tope: 3x promedio convenio)
  periodosIndemnizacion: number;       // 1 mes por año trabajado (mínimo 1)
  indemnizacionAntiguedad: number;
  
  // Indemnización sustitutiva de preaviso (Art. 232 LCT)
  aplicaPreaviso: boolean;
  diasPreaviso: number;                // 15 días (< 3 meses), 1 mes (< 5 años), 2 meses (> 5 años)
  indemnizacionPreaviso: number;
  
  // Integración mes de despido (Art. 233 LCT)
  aplicaIntegracionMes: boolean;
  diasIntegracionMes: number;
  integracionMesDespido: number;
  
  // SAC sobre indemnizaciones (Art. 123 LCT)
  sacSobrePreaviso: number;
  sacSobreIntegracion: number;
  
  // Multas (si aplican)
  multaArt80: number;                  // Certificados de trabajo (3 sueldos)
  multaArt9Ley25013: number;           // Deficiente registración
  multaArt15Ley24013: number;          // Empleo no registrado
  
  // Descuentos
  descuentosAplicados: {
    concepto: string;
    monto: number;
  }[];
  totalDescuentos: number;
  
  // Aportes (solo si es formal)
  esEmpleadoFormal: boolean;
  aportesEmpleado: number;
  contribucionesPatronales: number;
  
  // Totales
  totalBruto: number;
  totalNeto: number;
  
  // Detalle de cálculos (para auditoría)
  detalleCalculos: IDetalleCalculo[];
  
  // Estado y pago
  estado: 'borrador' | 'calculada' | 'aprobada' | 'pagada' | 'anulada';
  fechaCalculo: Date;
  fechaAprobacion?: Date;
  aprobadoPor?: string;
  fechaPago?: Date;
  medioDePago?: string;
  banco?: string;
  
  // Gastos relacionados
  gastosRelacionados: mongoose.Types.ObjectId[];
  
  // Observaciones
  observaciones?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const DetalleCalculoSchema = new Schema({
  concepto: { type: String, required: true },
  descripcion: { type: String, required: true },
  diasBase: { type: Number },
  valorDiario: { type: Number },
  porcentaje: { type: Number },
  monto: { type: Number, required: true }
}, { _id: false });

const LiquidacionFinalSchema = new Schema({
  empleadoId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  empleadoNombre: { type: String, required: true },
  empleadoApellido: { type: String, required: true },
  empleadoDocumento: { type: String, required: true },
  empleadoCuit: { type: String },
  
  // Datos del empleo
  fechaIngreso: { type: Date, required: true },
  fechaEgreso: { type: Date, required: true },
  antiguedadAnios: { type: Number, default: 0 },
  antiguedadMeses: { type: Number, default: 0 },
  antiguedadDias: { type: Number, default: 0 },
  sueldoBase: { type: Number, required: true },
  mejorRemuneracion: { type: Number, required: true },
  
  // Tipo de baja
  tipoBaja: {
    type: String,
    enum: TIPOS_BAJA,
    required: true
  },
  motivoBaja: { type: String },
  
  // Desglose de conceptos
  diasTrabajadosMes: { type: Number, default: 0 },
  salarioProporcional: { type: Number, default: 0 },
  
  // Vacaciones
  diasVacacionesCorrespondientes: { type: Number, default: 0 },
  diasVacacionesGozadas: { type: Number, default: 0 },
  diasVacacionesPendientes: { type: Number, default: 0 },
  vacacionesProporcionales: { type: Number, default: 0 },
  plusVacacional: { type: Number, default: 0 },
  
  // SAC
  mesesTrabajadosSemestre: { type: Number, default: 0 },
  sacProporcional: { type: Number, default: 0 },
  
  // Indemnización por antigüedad
  aplicaIndemnizacion: { type: Boolean, default: false },
  baseIndemnizacion: { type: Number, default: 0 },
  periodosIndemnizacion: { type: Number, default: 0 },
  indemnizacionAntiguedad: { type: Number, default: 0 },
  
  // Preaviso
  aplicaPreaviso: { type: Boolean, default: false },
  diasPreaviso: { type: Number, default: 0 },
  indemnizacionPreaviso: { type: Number, default: 0 },
  
  // Integración mes despido
  aplicaIntegracionMes: { type: Boolean, default: false },
  diasIntegracionMes: { type: Number, default: 0 },
  integracionMesDespido: { type: Number, default: 0 },
  
  // SAC sobre indemnizaciones
  sacSobrePreaviso: { type: Number, default: 0 },
  sacSobreIntegracion: { type: Number, default: 0 },
  
  // Multas
  multaArt80: { type: Number, default: 0 },
  multaArt9Ley25013: { type: Number, default: 0 },
  multaArt15Ley24013: { type: Number, default: 0 },
  
  // Descuentos
  descuentosAplicados: [{
    concepto: { type: String },
    monto: { type: Number }
  }],
  totalDescuentos: { type: Number, default: 0 },
  
  // Aportes
  esEmpleadoFormal: { type: Boolean, default: false },
  aportesEmpleado: { type: Number, default: 0 },
  contribucionesPatronales: { type: Number, default: 0 },
  
  // Totales
  totalBruto: { type: Number, default: 0 },
  totalNeto: { type: Number, default: 0 },
  
  // Detalle de cálculos
  detalleCalculos: [DetalleCalculoSchema],
  
  // Estado y pago
  estado: {
    type: String,
    enum: ['borrador', 'calculada', 'aprobada', 'pagada', 'anulada'],
    default: 'borrador'
  },
  fechaCalculo: { type: Date },
  fechaAprobacion: { type: Date },
  aprobadoPor: { type: String },
  fechaPago: { type: Date },
  medioDePago: { type: String, enum: MEDIO_PAGO },
  banco: { type: String, enum: CAJAS },
  
  // Gastos relacionados
  gastosRelacionados: [{ type: Schema.Types.ObjectId, ref: 'Gasto' }],
  
  // Observaciones
  observaciones: { type: String }
}, {
  timestamps: true
});

// Índices
LiquidacionFinalSchema.index({ empleadoId: 1 });
LiquidacionFinalSchema.index({ fechaEgreso: 1 });
LiquidacionFinalSchema.index({ estado: 1 });
LiquidacionFinalSchema.index({ tipoBaja: 1 });

export default mongoose.model<ILiquidacionFinal>('LiquidacionFinal', LiquidacionFinalSchema);
