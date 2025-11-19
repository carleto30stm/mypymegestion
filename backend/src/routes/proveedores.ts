import express from 'express';
import {
  getProveedores,
  getProveedorById,
  createProveedor,
  updateProveedor,
  deleteProveedor,
  updateSaldoCuenta,
  searchProveedores
} from '../controllers/proveedoresController.js';
import { agregarNota, obtenerNotas, eliminarNota } from '../controllers/proveedoresController.js';

const router = express.Router();

// Rutas de proveedores
router.get('/', getProveedores);
router.get('/search', searchProveedores);
router.get('/:id', getProveedorById);
router.get('/:id/notas', obtenerNotas);
router.post('/', createProveedor);
router.put('/:id', updateProveedor);
router.delete('/:id', deleteProveedor);
router.patch('/:id/saldo', updateSaldoCuenta);
router.post('/:id/notas', agregarNota);
router.delete('/:id/notas/:notaId', eliminarNota);

export default router;
