import express from 'express';
import {
  getTiposBaja,
  simularLiquidacionFinal,
  crearLiquidacionFinal,
  getLiquidacionesFinales,
  getLiquidacionFinalById,
  aprobarLiquidacionFinal,
  pagarLiquidacionFinal,
  anularLiquidacionFinal
} from '../controllers/liquidacionFinalController.js';

const router = express.Router();

// @desc    Obtener tipos de baja disponibles
// @route   GET /api/liquidacion-final/tipos-baja
router.get('/tipos-baja', getTiposBaja);

// @desc    Simular liquidación final (sin guardar)
// @route   POST /api/liquidacion-final/simular
router.post('/simular', simularLiquidacionFinal);

// @desc    Crear liquidación final
// @route   POST /api/liquidacion-final
router.post('/', crearLiquidacionFinal);

// @desc    Obtener todas las liquidaciones finales
// @route   GET /api/liquidacion-final
router.get('/', getLiquidacionesFinales);

// @desc    Obtener una liquidación final por ID
// @route   GET /api/liquidacion-final/:id
router.get('/:id', getLiquidacionFinalById);

// @desc    Aprobar liquidación final
// @route   PUT /api/liquidacion-final/:id/aprobar
router.put('/:id/aprobar', aprobarLiquidacionFinal);

// @desc    Pagar liquidación final
// @route   PUT /api/liquidacion-final/:id/pagar
router.put('/:id/pagar', pagarLiquidacionFinal);

// @desc    Anular liquidación final
// @route   PUT /api/liquidacion-final/:id/anular
router.put('/:id/anular', anularLiquidacionFinal);

export default router;
