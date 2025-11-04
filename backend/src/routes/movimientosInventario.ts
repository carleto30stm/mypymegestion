import express from 'express';
import {
  getMovimientos,
  getMovimientosByMateriaPrima,
  crearAjuste,
  getEstadisticasMovimientos,
  getKardex
} from '../controllers/movimientosInventarioController.js';

const router = express.Router();

// Rutas de movimientos de inventario
router.get('/', getMovimientos);
router.get('/estadisticas', getEstadisticasMovimientos);
router.get('/materia-prima/:id', getMovimientosByMateriaPrima);
router.get('/kardex/:id', getKardex);
router.post('/ajuste', crearAjuste);

export default router;
