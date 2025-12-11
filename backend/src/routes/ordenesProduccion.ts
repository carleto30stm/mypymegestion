import express from 'express';
import {
  getOrdenes,
  getOrdenById,
  crearOrden,
  editarOrden,
  iniciarProduccion,
  completarProduccion,
  cancelarOrden,
  enviarOrdenAProveedor,
  obtenerEstadisticas
} from '../controllers/ordenesProduccionController.js';

const router = express.Router();

// Rutas de estadísticas
router.get('/estadisticas', obtenerEstadisticas);

// Rutas de órdenes
router.get('/', getOrdenes);
router.get('/:id', getOrdenById);
router.post('/', crearOrden);
router.put('/:id', editarOrden);
router.post('/:id/iniciar', iniciarProduccion);
router.post('/:id/enviar', enviarOrdenAProveedor);
router.post('/:id/completar', completarProduccion);
router.post('/:id/cancelar', cancelarOrden);

export default router;
