import { Router } from 'express';
import {
  // Configuración
  getConfiguracionVigente,
  getConfiguraciones,
  crearConfiguracion,
  
  // Intereses
  getInteresesPorCliente,
  getIntereses,
  getInteresById,
  actualizarCalculoInteres,
  cobrarIntereses,
  condonarIntereses,
  getEstadisticasIntereses,
  generarPDFInteresesCliente
  , ejecutarCalculoManualHandler
  , crearInteresesDesdeVentasHandler
} from '../controllers/interesesController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Exponer endpoint manual SIN auth en entorno de desarrollo (o si se habilita)
router.post('/calcular/manual', ejecutarCalculoManualHandler);
// Endpoint para generar InteresPunitorio desde ventas vencidas (aplicaDesde)
router.post('/crear/desde-ventas', crearInteresesDesdeVentasHandler);

// Todas las demás rutas requieren autenticación
router.use(protect);

// ========== CONFIGURACIÓN DE TASA ==========
router.get('/configuracion/vigente', getConfiguracionVigente);
router.get('/configuracion', getConfiguraciones);
router.post('/configuracion', crearConfiguracion); // Admin/oper_ad

// ========== GESTIÓN DE INTERESES ==========
router.get('/estadisticas', getEstadisticasIntereses);
router.get('/cliente/:clienteId/pdf', generarPDFInteresesCliente); // PDF de intereses
router.get('/cliente/:clienteId', getInteresesPorCliente);
router.get('/:id', getInteresById);
router.get('/', getIntereses);

router.patch('/:id/calcular', actualizarCalculoInteres);
router.post('/:id/cobrar', cobrarIntereses); // Admin/oper_ad
router.post('/:id/condonar', condonarIntereses); // Solo admin

export default router;

