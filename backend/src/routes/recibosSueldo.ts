import express from 'express';
import {
  generarReciboPDF,
  generarTodosLosRecibos,
  previsualizarRecibo,
  getHistorialRecibos
} from '../controllers/recibosSueldoController.js';

const router = express.Router();

// =====================================================
// RUTAS DE RECIBOS DE SUELDO (PDF)
// =====================================================

// @desc    Generar recibo de sueldo PDF para un empleado
// @route   GET /api/recibos-sueldo/generar/:periodoId/:empleadoId
router.get('/generar/:periodoId/:empleadoId', generarReciboPDF);

// @desc    Listar todos los recibos de un período
// @route   GET /api/recibos-sueldo/generar-todos/:periodoId
router.get('/generar-todos/:periodoId', generarTodosLosRecibos);

// @desc    Previsualizar recibo (datos JSON)
// @route   GET /api/recibos-sueldo/preview/:periodoId/:empleadoId
router.get('/preview/:periodoId/:empleadoId', previsualizarRecibo);

// @desc    Obtener historial de recibos de un empleado
// @route   GET /api/recibos-sueldo/historial/:empleadoId
router.get('/historial/:empleadoId', getHistorialRecibos);

export default router;
