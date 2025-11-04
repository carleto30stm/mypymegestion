import express from 'express';
import {
  getRecetas,
  getRecetaById,
  getRecetasByProducto,
  crearReceta,
  actualizarReceta,
  eliminarReceta,
  calcularCostoActual,
  simularProduccion,
  obtenerEstadisticas
} from '../controllers/recetasController.js';

const router = express.Router();

// Rutas de estadísticas y simulación
router.get('/estadisticas', obtenerEstadisticas);
router.post('/simular', simularProduccion);

// Rutas de recetas
router.get('/', getRecetas);
router.get('/:id', getRecetaById);
router.get('/producto/:productoId', getRecetasByProducto);
router.get('/:id/costo-actual', calcularCostoActual);
router.post('/', crearReceta);
router.put('/:id', actualizarReceta);
router.delete('/:id', eliminarReceta);

export default router;
