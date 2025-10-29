import express from 'express';
import {
  getVentas,
  getVentasByRango,
  getVentaById,
  crearVenta,
  anularVenta,
  registrarPago,
  getEstadisticasVentas
} from '../controllers/ventasController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas públicas (requieren autenticación básica)
router.route('/')
  .get(getVentas)
  .post(crearVenta); // Todos los usuarios pueden crear ventas

router.get('/rango', getVentasByRango); // Filtrar por rango de fechas

router.get('/estadisticas', getEstadisticasVentas); // Estadísticas de ventas

router.route('/:id')
  .get(getVentaById);

// Rutas especiales
router.patch('/:id/anular', anularVenta); // Solo admin puede anular

router.patch('/:id/registrar-pago', registrarPago); // admin/oper_ad pueden registrar pagos

export default router;
