import express from 'express';
import {
  getMovimientos,
  getResumen,
  getAntiguedadDeuda,
  crearAjuste,
  anularMovimiento,
  generarPDFEstadoCuenta,
  generarPDFMovimientos
} from '../controllers/cuentaCorrienteController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
// router.use(protect);

// Rutas de consulta (todos los roles autenticados)
router.get('/:clienteId/movimientos', getMovimientos);
router.get('/:clienteId/resumen', getResumen);
router.get('/:clienteId/antiguedad', getAntiguedadDeuda);

// Rutas de generación de PDF
router.get('/:clienteId/pdf/estado-cuenta', generarPDFEstadoCuenta);
router.get('/:clienteId/pdf/movimientos', generarPDFMovimientos);

// Rutas de modificación (validación de rol en el controlador)
router.post('/ajuste', crearAjuste);
router.patch('/movimientos/:movimientoId/anular', anularMovimiento);

export default router;

