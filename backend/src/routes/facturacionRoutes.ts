import express from 'express';
import * as facturacionController from '../controllers/facturacionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
// router.use(protect);

/**
 * @route   GET /api/facturacion/config/puntos-venta
 * @desc    Obtener puntos de venta habilitados en AFIP
 * @access  Private (admin)
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id para evitar conflictos
 */
router.get('/config/puntos-venta', facturacionController.obtenerPuntosVenta);

/**
 * @route   POST /api/facturacion/desde-venta
 * @desc    Crear factura desde una venta existente
 * @access  Private (admin, oper_ad)
 */
router.post('/desde-venta', facturacionController.crearFacturaDesdeVenta);

/**
 * @route   POST /api/facturacion/desde-ventas
 * @desc    Crear factura desde múltiples ventas (agrupación)
 * @access  Private (admin, oper_ad)
 */
router.post('/desde-ventas', facturacionController.crearFacturaDesdeVentas);

/**
 * @route   POST /api/facturacion/manual
 * @desc    Crear factura manual (sin venta previa)
 * @access  Private (admin, oper_ad)
 */
router.post('/manual', facturacionController.crearFacturaManual);

/**
 * @route   GET /api/facturacion
 * @desc    Listar facturas con filtros
 * @access  Private
 */
router.get('/', facturacionController.listarFacturas);

/**
 * @route   GET /api/facturacion/:id/verificar-cae
 * @desc    Verificar CAE en AFIP
 * @access  Private
 * IMPORTANTE: Esta ruta debe estar ANTES de /:id para evitar conflictos
 */
router.get('/:id/verificar-cae', facturacionController.verificarCAE);

/**
 * @route   GET /api/facturacion/:id
 * @desc    Obtener factura por ID
 * @access  Private
 */
router.get('/:id', facturacionController.obtenerFactura);

/**
 * @route   POST /api/facturacion/:id/autorizar
 * @desc    Autorizar factura en AFIP (solicitar CAE)
 * @access  Private (admin)
 */
router.post('/:id/autorizar', facturacionController.autorizarFactura);

/**
 * @route   POST /api/facturacion/:id/anular
 * @desc    Anular factura
 * @access  Private (admin)
 */
router.post('/:id/anular', facturacionController.anularFactura);

export default router;
