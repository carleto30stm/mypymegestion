import mongoose from 'mongoose';
import { CAJAS } from '../Types/Types.js';

// Esquema para saldos por cada cuenta (EFECTIVO, BANCOS, ETC)
// Define cuánto hay en cada "caja" o cuenta
const saldoPorCajaSchema = new mongoose.Schema({
    caja: { type: String, enum: CAJAS, required: true },
    monto: { type: Number, required: true }
}, { _id: false });

const cajaSesionSchema = new mongoose.Schema({
    // --- APERTURA ---
    fechaApertura: { type: Date, default: Date.now },
    usuarioApertura: { type: String, required: true }, // Username del operador que abre

    // Saldos ingresados MANUALMENTE por el usuario al abrir (lo que cuenta físicamente)
    saldosIniciales: [saldoPorCajaSchema],

    // --- CIERRE ---
    fechaCierre: { type: Date },
    usuarioCierre: { type: String }, // Username del operador que cierra

    // Saldos ingresados MANUALMENTE al cerrar (lo que cuenta físicamente)
    saldosFinalesDeclarados: [saldoPorCajaSchema],

    // Saldos CALCULADOS por el sistema (Saldo Inicial + Gastos del período)
    // NOTA: Se reciben desde el Frontend (BankSummary logic) para evitar duplicar lógica en backend
    saldosFinalesSistema: [saldoPorCajaSchema],

    // Diferencia (Declarado - Sistema). Si es negativo = Faltante.
    diferencias: [saldoPorCajaSchema],

    estado: {
        type: String,
        enum: ['abierta', 'cerrada'],
        default: 'abierta',
        index: true
    },

    observacionesApertura: { type: String },
    observacionesCierre: { type: String },

}, { timestamps: true });

// Índice para búsquedas rápidas por fecha
cajaSesionSchema.index({ fechaApertura: -1 });

const CajaSesion = mongoose.model('CajaSesion', cajaSesionSchema);

export default CajaSesion;
