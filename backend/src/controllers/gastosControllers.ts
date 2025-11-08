// Fix: Aliased Request and Response to avoid global type conflicts.
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import Gasto from '../models/Gasto.js';

// @desc    Obtener gastos con filtros opcionales
// @route   GET /api/gastos?desde=2024-01-01&hasta=2024-12-31&limite=100
// @access  Private
// Fix: Use the standard Express Request type. The 'user' property is added via declaration merging.
export const getGastos = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const { desde, hasta, limite } = req.query;
        
        // Construir query de filtrado
        let query: any = {};
        
        // Si hay rango de fechas, filtrar
        if (desde || hasta) {
            query.fecha = {};
            if (desde) {
                // Inicio del día (00:00:00)
                const fechaDesde = new Date(desde as string);
                fechaDesde.setHours(0, 0, 0, 0);
                query.fecha.$gte = fechaDesde;
            }
            if (hasta) {
                // Final del día (23:59:59.999)
                const fechaHasta = new Date(hasta as string);
                fechaHasta.setHours(23, 59, 59, 999);
                query.fecha.$lte = fechaHasta;
            }
        } else {
            // Por defecto: últimos 3 meses para mejorar performance
            const tresMesesAtras = new Date();
            tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
            query.fecha = { $gte: tresMesesAtras };
        }
        
        // Aplicar límite si se especifica (por defecto sin límite para mantener compatibilidad)
        let queryBuilder = Gasto.find(query).sort({ fecha: -1 });
        
        if (limite) {
            queryBuilder = queryBuilder.limit(Number(limite));
        }
        
        const gastos = await queryBuilder;
        
        // Opcional: incluir metadata para debugging
        const metadata = {
            count: gastos.length,
            filtros: {
                desde: desde || 'últimos 3 meses',
                hasta: hasta || 'hoy',
                limite: limite || 'sin límite'
            }
        };
        
        res.json(gastos);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Crear un nuevo gasto
// @route   POST /api/gastos
// @access  Private
// Fix: Use the standard Express Request type. The 'user' property is added via declaration merging.
export const createGasto = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const nuevoGasto = new Gasto(req.body);
        const gastoGuardado = await nuevoGasto.save();
        res.status(201).json(gastoGuardado);
    } catch (error: any) {
        res.status(400).json({ message: 'Datos inválidos', details: error.message });
    }
};

// @desc    Actualizar un gasto
// @route   PUT /api/gastos/:id
// @access  Private
// Fix: Use the standard Express Request type. The 'user' property is added via declaration merging.
export const updateGasto = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const gasto = await Gasto.findById(req.params.id);

        if (gasto) {
            const gastoActualizado = await Gasto.findByIdAndUpdate(req.params.id, req.body, { new: true });
            res.json(gastoActualizado);
        } else {
            res.status(404).json({ message: 'Gasto no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Eliminar un gasto
// @route   DELETE /api/gastos/:id
// @access  Private
// Fix: Use the standard Express Request type. The 'user' property is added via declaration merging.
export const deleteGasto = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const gasto = await Gasto.findById(req.params.id);

        if (gasto) {
            await Gasto.findByIdAndDelete(req.params.id);
            res.json({ message: 'Gasto eliminado correctamente' });
        } else {
            res.status(404).json({ message: 'Gasto no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
