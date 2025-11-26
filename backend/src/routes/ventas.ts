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
  getEstadisticasProductos,
  confirmarVenta,
  getVentasSinFacturar,
  getVentasPendientesProduccion
} from '../controllers/ventasController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas públicas (requieren autenticación básica)
router.route('/')
  .get(protect, getVentas)
  .post(protect, crearVenta); // Todos los usuarios autenticados pueden crear ventas

router.get('/rango', protect, getVentasByRango); // Filtrar por rango de fechas

router.get('/estadisticas', protect, getEstadisticasVentas); // Estadísticas de ventas

router.get('/estadisticas-productos', protect, getEstadisticasProductos); // Métricas detalladas por producto

router.get('/sin-facturar', protect, getVentasSinFacturar); // Ventas confirmadas que requieren factura y no están facturadas

router.get('/pendientes-produccion', protect, getVentasPendientesProduccion); // Ventas confirmadas con productos que tienen receta

router.route('/:id')
  .get(protect, getVentaById)
  .put(protect, actualizarVenta); // admin/oper_ad pueden actualizar ventas pendientes

// Rutas especiales
router.patch('/:id/confirmar', protect, confirmarVenta); // admin/oper_ad pueden confirmar

router.patch('/:id/anular', protect, anularVenta); // Solo admin puede anular

router.patch('/:id/registrar-pago', protect, registrarPago); // admin/oper_ad pueden registrar pagos

export default router;
