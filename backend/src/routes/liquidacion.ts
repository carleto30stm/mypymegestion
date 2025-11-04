import express from 'express';
import {
  getPeriodos,
  getPeriodoById,
  createPeriodo,
  agregarHorasExtra,
  registrarAdelanto,
  liquidarEmpleado,
  cerrarPeriodo,
  actualizarEstadoPeriodo,
  deletePeriodo,
  agregarEmpleado
} from '../controllers/liquidacionController.js';

const router = express.Router();

// Obtener todos los períodos
router.get('/', getPeriodos);

// Obtener período por ID
router.get('/:id', getPeriodoById);

// Crear nuevo período
router.post('/', createPeriodo);

// Agregar empleado a un período
router.post('/agregar-empleado', agregarEmpleado);

// Agregar horas extra a liquidación
router.post('/horas-extra', agregarHorasExtra);

// Registrar adelanto
router.post('/adelanto', registrarAdelanto);

// Liquidar empleado (generar pago)
router.post('/liquidar', liquidarEmpleado);

// Cerrar período
router.post('/:id/cerrar', cerrarPeriodo);

// Actualizar estado del período
router.patch('/:id/estado', actualizarEstadoPeriodo);

// Eliminar período
router.delete('/:id', deletePeriodo);

export default router;
