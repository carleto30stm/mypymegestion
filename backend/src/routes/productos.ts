import express from 'express';
import {
  getProductos,
  getProductosStockBajo,
  getProductoById,
  getProductoByCodigo,
  createProducto,
  updateProducto,
  ajustarStock,
  deleteProducto,
  reactivarProducto
} from '../controllers/productosController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas públicas (requieren autenticación básica)
router.route('/')
  .get(getProductos)
  .post(createProducto); // admin/oper_ad pueden crear

router.get('/stock-bajo', getProductosStockBajo);

router.get('/codigo/:codigo', getProductoByCodigo);

router.route('/:id')
  .get(getProductoById)
  .put(updateProducto)    // admin/oper_ad pueden editar
  .delete(deleteProducto); // admin puede eliminar (soft delete)

// Rutas especiales
router.patch('/:id/ajustar-stock', ajustarStock); // admin/oper_ad pueden ajustar stock

router.patch('/:id/reactivar', reactivarProducto); // admin puede reactivar

export default router;
