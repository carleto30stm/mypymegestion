import type { Request, Response } from 'express';
import CajaSesion from '../models/CajaSesion.js';
import { CAJAS } from '../Types/Types.js';

// @desc    Obtener estado actual de la caja (si hay sesión abierta)
// @route   GET /api/caja/estado
// @access  Private
export const getEstadoCaja = async (req: Request, res: Response) => {
    try {
        // Buscar la última sesión abierta
        const sesionAbierta = await CajaSesion.findOne({ estado: 'abierta' });

        if (!sesionAbierta) {
            return res.json({
                estado: 'cerrada',
                sesion: null
            });
        }

        res.json({
            estado: 'abierta',
            sesion: sesionAbierta
        });
    } catch (error) {
        console.error('Error al obtener estado de caja:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Abrir una nueva sesión de caja
// @route   POST /api/caja/abrir
// @access  Private
// @body    { saldosIniciales: [{caja: 'EFECTIVO', monto: 1000}, ...], observacionesApertura?: string }
export const abrirCaja = async (req: Request, res: Response) => {
    try {
        // 1. Validar que no haya una sesión ya abierta
        const sessionExistente = await CajaSesion.findOne({ estado: 'abierta' });
        if (sessionExistente) {
            return res.status(409).json({ message: 'Ya existe una caja abierta. Debe cerrarla antes de abrir una nueva.' });
        }

        // 2. Obtener datos del body
        const { saldosIniciales, observacionesApertura } = req.body;

        if (!saldosIniciales || !Array.isArray(saldosIniciales) || saldosIniciales.length === 0) {
            return res.status(400).json({ message: 'Debe ingresar los saldos iniciales (al menos Efectivo)' });
        }

        // 3. Crear nueva sesión
        // Usamos req.user?.username inyectado por el middleware de auth
        // Nota: Asumimos que el middleware add req.user existe y tiene username
        const nuevaSesion = new CajaSesion({
            fechaApertura: new Date(),
            usuarioApertura: (req as any).user?.username || 'Desconocido',
            saldosIniciales,
            observacionesApertura,
            estado: 'abierta'
        });

        const sesionGuardada = await nuevaSesion.save();

        res.status(201).json(sesionGuardada);
    } catch (error) {
        console.error('Error al abrir caja:', error);
        res.status(500).json({ message: 'Error en el servidor al abrir caja' });
    }
};

// @desc    Cerrar sesión de caja (Arqueo)
// @route   POST /api/caja/cerrar
// @access  Private
// @body    { saldosFinalesDeclarados: [...], saldosFinalesSistema: [...], observacionesCierre?: string }
export const cerrarCaja = async (req: Request, res: Response) => {
    try {
        // 1. Buscar sesión abierta
        const sesionAbierta = await CajaSesion.findOne({ estado: 'abierta' });
        if (!sesionAbierta) {
            return res.status(404).json({ message: 'No hay ninguna caja abierta para cerrar.' });
        }

        const { saldosFinalesDeclarados, saldosFinalesSistema, observacionesCierre } = req.body;

        if (!saldosFinalesDeclarados || !saldosFinalesSistema) {
            return res.status(400).json({ message: 'Faltan datos de saldos declarados o de sistema.' });
        }

        // 2. Calcular diferencias (Declarado - Sistema)
        // Iteramos sobre todos los bancos definidos en Types
        const diferencias = CAJAS.map(cajaNombre => {
            const declarado = saldosFinalesDeclarados.find((s: any) => s.caja === cajaNombre)?.monto || 0;
            const sistema = saldosFinalesSistema.find((s: any) => s.caja === cajaNombre)?.monto || 0;

            return {
                caja: cajaNombre,
                monto: declarado - sistema
            };
        });

        // 3. Actualizar sesión
        sesionAbierta.fechaCierre = new Date();
        sesionAbierta.usuarioCierre = (req as any).user?.username || 'Desconocido';
        sesionAbierta.saldosFinalesDeclarados = saldosFinalesDeclarados;
        sesionAbierta.saldosFinalesSistema = saldosFinalesSistema;
        sesionAbierta.diferencias = diferencias as any;
        sesionAbierta.observacionesCierre = observacionesCierre;
        sesionAbierta.estado = 'cerrada';

        const sesionCerrada = await sesionAbierta.save();

        res.json(sesionCerrada);

    } catch (error) {
        console.error('Error al cerrar caja:', error);
        res.status(500).json({ message: 'Error en el servidor al cerrar caja' });
    }
};

// @desc    Obtener historial de cierres
// @route   GET /api/caja/historial
// @access  Private (Admin/Encargado)
export const getHistorialCaja = async (req: Request, res: Response) => {
    try {
        const { pagina = 1, limite = 20 } = req.query;

        const historial = await CajaSesion.find({ estado: 'cerrada' })
            .sort({ fechaCierre: -1 })
            .limit(Number(limite))
            .skip((Number(pagina) - 1) * Number(limite));

        const total = await CajaSesion.countDocuments({ estado: 'cerrada' });

        res.json({
            data: historial,
            pagination: {
                total,
                pagina: Number(pagina),
                limite: Number(limite),
                totalPaginas: Math.ceil(total / Number(limite))
            }
        });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
