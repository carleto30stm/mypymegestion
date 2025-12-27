import type { Request, Response, NextFunction } from 'express';
import CajaSesion from '../models/CajaSesion.js';

/**
 * Middleware para bloquear operaciones financieras si no hay una caja abierta.
 * Se debe aplicar en rutas de creación/modificación de:
 * - Ventas
 * - Gastos
 * - Recibos
 */
export const checkCajaAbierta = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Buscar si existe alguna sesión con estado 'abierta'
        const sesionAbierta = await CajaSesion.findOne({ estado: 'abierta' });

        if (!sesionAbierta) {
            return res.status(409).json({
                message: 'No existe una Caja Abierta. Debe iniciar turno (Apertura de Caja) antes de realizar operaciones.',
                bloqueoCaja: true // Flag para que el frontend reconozca este error específico
            });
        }

        // Si hay caja abierta, continuar
        next();
    } catch (error) {
        console.error('Error en checkCajaAbierta:', error);
        res.status(500).json({ message: 'Error interno verificando estado de caja' });
    }
};
