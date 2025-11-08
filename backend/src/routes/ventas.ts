import express from 'express';
import {
  getVentas,
  getVentasByRango,
  getVentaById,
  crearVenta,
  actualizarVenta,
  anularVenta,
  registrarPago,
  getEstadisticasVentas,
  confirmarVenta
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
  .get(getVentaById)
  .put(actualizarVenta); // admin/oper_ad pueden actualizar ventas pendientes

// Rutas especiales
router.patch('/:id/confirmar', confirmarVenta); // admin/oper_ad pueden confirmar

router.patch('/:id/anular', anularVenta); // Solo admin puede anular

router.patch('/:id/registrar-pago', registrarPago); // admin/oper_ad pueden registrar pagos

export default router;
