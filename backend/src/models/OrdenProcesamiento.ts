import mongoose, { Schema, Document } from 'mongoose';

export interface IItemProcesamiento {
    materiaPrimaId: mongoose.Types.ObjectId;
    codigoMateriaPrima: string;
    nombreMateriaPrima: string;
    cantidad: number;
    lote?: string;
    unidadMedida: string;
    costoUnitario?: number; // Costo al momento del envío (para valorizar salida)
}

export interface IOrdenProcesamiento extends Document {
    numeroOrden: string;
    proveedorId: mongoose.Types.ObjectId;
    tipoProcesamiento: 'interno' | 'externo';

    // Fechas
    fechaEnvio: Date;
    fechaEstimadaRecepcion?: Date;
    fechaRecepcionReal?: Date;

    // Estado
    estado: 'borrador' | 'pendiente' | 'en_proceso' | 'completada' | 'cancelada';

    // Items
    itemsSalida: IItemProcesamiento[];
    itemsEntrada: IItemProcesamiento[];

    // Costos
    costoServicio: number; // Costo de la mano de obra
    moneda: 'ARS' | 'USD';
    tipoCambio?: number;

    // Auditoría
    observaciones?: string;
    createdBy: mongoose.Types.ObjectId;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

const ItemProcesamientoSchema = new Schema<IItemProcesamiento>({
    materiaPrimaId: {
        type: Schema.Types.ObjectId,
        ref: 'MateriaPrima',
        required: true
    },
    codigoMateriaPrima: { type: String, required: true },
    nombreMateriaPrima: { type: String, required: true },
    cantidad: { type: Number, required: true, min: 0 },
    lote: { type: String },
    unidadMedida: { type: String, required: true },
    costoUnitario: { type: Number }
}, { _id: false });

const OrdenProcesamientoSchema = new Schema<IOrdenProcesamiento>({
    numeroOrden: {
        type: String,
        unique: true,
        trim: true
    },
    proveedorId: {
        type: Schema.Types.ObjectId,
        ref: 'Proveedor',
        required: [true, 'El proveedor es requerido']
    },
    tipoProcesamiento: {
        type: String,
        enum: ['interno', 'externo'],
        default: 'externo'
    },
    fechaEnvio: {
        type: Date,
        default: Date.now
    },
    fechaEstimadaRecepcion: Date,
    fechaRecepcionReal: Date,
    estado: {
        type: String,
        enum: ['borrador', 'pendiente', 'en_proceso', 'completada', 'cancelada'],
        default: 'borrador'
    },
    itemsSalida: [ItemProcesamientoSchema],
    itemsEntrada: [ItemProcesamientoSchema],
    costoServicio: {
        type: Number,
        default: 0,
        min: 0
    },
    moneda: {
        type: String,
        enum: ['ARS', 'USD'],
        default: 'ARS'
    },
    tipoCambio: Number,
    observaciones: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: {
        createdAt: 'fechaCreacion',
        updatedAt: 'fechaActualizacion'
    }
});

// Middleware pre-save para generar número de orden
OrdenProcesamientoSchema.pre('save', async function (next) {
    try {
        if (!this.numeroOrden) {
            const fecha = new Date();
            const año = fecha.getFullYear();
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');

            const ultimaOrden = await mongoose.model('OrdenProcesamiento').findOne({
                numeroOrden: new RegExp(`^PROC-${año}${mes}`)
            }).sort({ numeroOrden: -1 });

            let siguienteNumero = 1;
            if (ultimaOrden && ultimaOrden.numeroOrden) {
                const numeroActual = parseInt(ultimaOrden.numeroOrden.split('-')[2]);
                siguienteNumero = numeroActual + 1;
            }

            this.numeroOrden = `PROC-${año}${mes}-${String(siguienteNumero).padStart(4, '0')}`;
        }
        next();
    } catch (error: any) {
        next(error);
    }
});

const OrdenProcesamiento = mongoose.model<IOrdenProcesamiento>('OrdenProcesamiento', OrdenProcesamientoSchema);

export default OrdenProcesamiento;
