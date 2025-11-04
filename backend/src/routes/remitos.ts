import express from 'express';
import {
  getRemitos,
  getRemitoById,
  generarRemitoDesdeVenta,
  actualizarEstadoRemito,
  actualizarItemsRemito,
  eliminarRemito,
  getEstadisticasRemitos
} from '../controllers/remitosController.js';
// import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas públicas (requieren autenticación básica)
router.get('/', getRemitos);
router.get('/estadisticas', getEstadisticasRemitos);
router.get('/:id', getRemitoById);

// Crear remito desde venta - todos los usuarios autenticados pueden hacerlo
router.post('/desde-venta', generarRemitoDesdeVenta);

// Actualizar estado - admin, oper_ad y oper pueden hacerlo
router.patch('/:id/estado', actualizarEstadoRemito);

// Actualizar items - admin, oper_ad y oper pueden hacerlo
router.patch('/:id/items', actualizarItemsRemito);

// Eliminar remito - solo admin (se valida en el controlador)
router.delete('/:id', eliminarRemito);

export default router;
