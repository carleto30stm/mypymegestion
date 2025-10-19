// Fix: Aliased Request and Response to avoid global type conflicts.
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import Gasto from '../models/Gasto.js';

// @desc    Obtener todos los gastos
// @route   GET /api/gastos
// @access  Private
// Fix: Use the standard Express Request type. The 'user' property is added via declaration merging.
export const getGastos = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        // Ordenamos por fecha descendente para ver los más recientes primero
        const gastos = await Gasto.find().sort({ fecha: -1 });
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
