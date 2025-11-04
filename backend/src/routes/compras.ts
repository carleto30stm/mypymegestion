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

const router = express.Router();

// Rutas de compras
router.get('/', getCompras);
router.get('/estadisticas', getEstadisticasCompras);
router.get('/:id', getCompraById);
router.post('/', createCompra);
router.put('/:id', updateCompra);
router.patch('/:id/estado', cambiarEstadoCompra);
router.delete('/:id', deleteCompra);
router.post('/:id/confirmar-recepcion', confirmarRecepcion);
router.post('/:id/confirmar-pago', confirmarPago);
router.post('/:id/anular', anularCompra);

export default router;
