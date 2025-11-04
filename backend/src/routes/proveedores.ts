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

const router = express.Router();

// Rutas de proveedores
router.get('/', getProveedores);
router.get('/search', searchProveedores);
router.get('/:id', getProveedorById);
router.post('/', createProveedor);
router.put('/:id', updateProveedor);
router.delete('/:id', deleteProveedor);
router.patch('/:id/saldo', updateSaldoCuenta);

export default router;
