import express from 'express';
import {
  getCompras,
  getCompraById,
  createCompra,
  updateCompra,
  cambiarEstadoCompra,
  deleteCompra,
  confirmarRecepcion,
  confirmarPago,
  anularCompra,
  getEstadisticasCompras
} from '../controllers/comprasController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas de compras
router.get('/', protect, getCompras);
router.get('/estadisticas', protect, getEstadisticasCompras);
router.get('/:id', protect, getCompraById);
router.post('/', protect, createCompra);
router.put('/:id', protect, updateCompra);
router.patch('/:id/estado', protect, cambiarEstadoCompra);
router.delete('/:id', protect, deleteCompra);
router.post('/:id/confirmar-recepcion', protect, confirmarRecepcion);
router.post('/:id/confirmar-pago', protect, confirmarPago);
router.post('/:id/anular', protect, anularCompra);

export default router;
