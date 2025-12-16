import express from 'express';
import {
  getRecibos,
  getReciboById,
  crearRecibo,
  anularRecibo,
  getEstadisticasCobranza,
  getRecibosPorCliente,
  corregirMonto
} from '../controllers/recibosController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
// router.use(protect);

// @route   GET /api/recibos/estadisticas
// @desc    Obtener estadísticas de cobranza
// @access  Private
router.get('/estadisticas', getEstadisticasCobranza);

// @route   GET /api/recibos/cliente/:clienteId
// @desc    Obtener recibos por cliente
// @access  Private
router.get('/cliente/:clienteId', getRecibosPorCliente);

// @route   GET /api/recibos
// @desc    Obtener todos los recibos con filtros
// @access  Private
router.get('/', getRecibos);

// @route   GET /api/recibos/:id
// @desc    Obtener recibo por ID
// @access  Private
router.get('/:id', getReciboById);

// @route   POST /api/recibos
// @desc    Crear nuevo recibo de pago
// @access  Private (admin/oper_ad/oper)
router.post('/', crearRecibo);

// @route   PATCH /api/recibos/:id/anular
// @desc    Anular recibo de pago
// @access  Private (admin only - se valida en el controlador)
router.patch('/:id/anular', anularRecibo);

// @route   PATCH /api/recibos/:id/corregir-monto
// @desc    Corregir monto de un recibo (crea gasto compensatorio)
// @access  Private (admin/oper_ad - se valida en el controlador)
router.patch('/:id/corregir-monto', protect, corregirMonto);

export default router;
