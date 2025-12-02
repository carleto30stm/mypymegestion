import { Router } from 'express';
import {
  getAntiguedadEmpleado,
  calcularAdicional,
  getAlertas,
  getRanking,
  getEstadisticas,
  getAntiguedadTodos,
  simularAntiguedad,
  getHistorialAntiguedad
} from '../controllers/antiguedadController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

/**
 * Rutas de Antigüedad de Empleados
 * 
 * Cálculo y gestión de antigüedad según LCT y CCT
 * - Consulta individual y masiva
 * - Cálculo de adicionales para liquidación
 * - Alertas de aniversarios
 * - Estadísticas y rankings
 */

// Todas las rutas requieren autenticación
router.use(protect);

// =====================================
// CONSULTAS GENERALES
// =====================================

// Obtener estadísticas generales de antigüedad
router.get('/estadisticas', getEstadisticas);

// Obtener ranking de empleados por antigüedad
router.get('/ranking', getRanking);

// Obtener alertas de aniversarios próximos
router.get('/alertas', getAlertas);

// Obtener antigüedad de todos los empleados
router.get('/todos', getAntiguedadTodos);

// =====================================
// CÁLCULOS Y SIMULACIONES
// =====================================

// Calcular adicional por antigüedad para liquidación
router.post('/calcular-adicional', calcularAdicional);

// Simular cálculo de antigüedad (sin empleado real)
router.post('/simular', simularAntiguedad);

// =====================================
// CONSULTAS POR EMPLEADO
// =====================================

// Obtener antigüedad de un empleado específico
router.get('/empleado/:empleadoId', getAntiguedadEmpleado);

// Obtener historial de antigüedad (solo admin)
router.get('/historial/:empleadoId', adminAuth, getHistorialAntiguedad);

export default router;
