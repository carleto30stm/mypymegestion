import mongoose, { Document, Schema } from 'mongoose';

export const TIPOS_MOVIMIENTO_PROVEEDOR = [
    'factura', // Aumenta deuda (Haber)
    'pago', // Disminuye deuda (Debe)
    'nota_credito', // Disminuye deuda (Debe)
    'nota_debito', // Aumenta deuda (Haber)
    'servicio_procesamiento', // Aumenta deuda (Haber) - Específico para nuestro caso
    'ajuste_saldo'
] as const;

export type TipoMovimientoProveedor = typeof TIPOS_MOVIMIENTO_PROVEEDOR[number];

export interface IMovimientoCuentaCorrienteProveedor extends Document {
    proveedorId: mongoose.Types.ObjectId;
    fecha: Date;
    tipo: TipoMovimientoProveedor;

    // Referencia al documento origen
    documentoTipo: string; // 'FACTURA', 'ORDEN_PAGO', 'ORDEN_PROCESAMIENTO', etc.
    documentoNumero?: string;
    documentoId?: mongoose.Types.ObjectId;

    concepto: string;
    observaciones?: string;

    // Importes
    debe: number; // Pagos, NC (Disminuye deuda)
    haber: number; // Facturas, ND, Servicios (Aumenta deuda)
    saldo: number; // Saldo acumulado

    creadoPor: mongoose.Types.ObjectId;
    anulado: boolean;
    fechaCreacion: Date;
}

const MovimientoCuentaCorrienteProveedorSchema = new Schema<IMovimientoCuentaCorrienteProveedor>({
    proveedorId: {
        type: Schema.Types.ObjectId,
        ref: 'Proveedor',
        required: true,
        index: true
    },
    fecha: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    tipo: {
        type: String,
        enum: TIPOS_MOVIMIENTO_PROVEEDOR,
        required: true
    },
    documentoTipo: {
        type: String,
        required: true,
        uppercase: true
    },
    documentoNumero: String,
    documentoId: Schema.Types.ObjectId,
    concepto: {
        type: String,
        required: true,
        trim: true
    },
    observaciones: String,
    debe: {
        type: Number,
        default: 0,
        min: 0
    },
    haber: {
        type: Number,
        default: 0,
        min: 0
    },
    saldo: {
        type: Number,
        required: true
    },
    creadoPor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    anulado: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: {
        createdAt: 'fechaCreacion',
        updatedAt: false
    }
});

// Índices
MovimientoCuentaCorrienteProveedorSchema.index({ proveedorId: 1, fecha: -1 });
MovimientoCuentaCorrienteProveedorSchema.index({ documentoId: 1 });

const MovimientoCuentaCorrienteProveedor = mongoose.model<IMovimientoCuentaCorrienteProveedor>(
    'MovimientoCuentaCorrienteProveedor',
    MovimientoCuentaCorrienteProveedorSchema
);

export default MovimientoCuentaCorrienteProveedor;
