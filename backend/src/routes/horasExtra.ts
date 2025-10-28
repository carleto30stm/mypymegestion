import { Router } from 'express';
import {
  getHorasExtra,
  getHorasExtraByEmployee,
  createHoraExtra,
  updateHoraExtra,
  marcarComoPagada,
  cancelarHoraExtra,
  deleteHoraExtra,
  getResumenHorasExtra
} from '../controllers/horasExtraController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Aplicar autenticación a todas las rutas
// router.use(protect);

// Obtener todas las horas extra con filtros opcionales
// GET /api/horas-extra?empleadoId=xxx&estado=xxx&fechaDesde=xxx&fechaHasta=xxx
router.get('/', getHorasExtra);

// Obtener resumen de horas extra (agregadas por empleado)
// GET /api/horas-extra/resumen?empleadoId=xxx&mes=2024-01
router.get('/resumen', getResumenHorasExtra);

// Obtener horas extra por empleado específico
// GET /api/horas-extra/empleado/:empleadoId
router.get('/empleado/:empleadoId', getHorasExtraByEmployee);

// Crear nueva hora extra
// POST /api/horas-extra
router.post('/', createHoraExtra);

// Actualizar hora extra
// PUT /api/horas-extra/:id
router.put('/:id', updateHoraExtra);

// Marcar hora extra como pagada
// PATCH /api/horas-extra/:id/pagar
router.patch('/:id/pagar', marcarComoPagada);

// Cancelar hora extra
// PATCH /api/horas-extra/:id/cancelar
router.patch('/:id/cancelar', cancelarHoraExtra);

// Eliminar hora extra (solo admin - se valida en el frontend)
// DELETE /api/horas-extra/:id
router.delete('/:id', deleteHoraExtra);

export default router;