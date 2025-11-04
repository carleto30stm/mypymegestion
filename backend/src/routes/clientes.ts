import express from 'express';
import {
  getClientes,
  getClientesActivos,
  getClienteById,
  getClienteByDocumento,
  getHistorialCompras,
  createCliente,
  updateCliente,
  actualizarSaldo,
  deleteCliente,
  reactivarCliente
} from '../controllers/clientesController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas públicas (requieren autenticación básica)
router.route('/')
  .get(getClientes)
  .post(createCliente); // admin/oper_ad pueden crear

router.get('/activos', getClientesActivos);

router.get('/documento/:numeroDocumento', getClienteByDocumento);

router.route('/:id')
  .get(getClienteById)
  .put(updateCliente)    // admin/oper_ad pueden editar
  .delete(deleteCliente); // admin puede eliminar (soft delete)

// Rutas especiales
router.get('/:id/historial', getHistorialCompras); // Historial de compras

router.patch('/:id/saldo', actualizarSaldo); // admin/oper_ad pueden actualizar saldo

router.patch('/:id/reactivar', reactivarCliente); // admin puede reactivar

export default router;
