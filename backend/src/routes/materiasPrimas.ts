import express from 'express';
import {
  getMateriasPrimas,
  getMateriaPrimaById,
  createMateriaPrima,
  updateMateriaPrima,
  deleteMateriaPrima,
  updateStock,
  searchMateriasPrimas,
  getAlertasStockBajo
} from '../controllers/materiasPrimasController.js';

const router = express.Router();

// Rutas de materias primas
router.get('/', getMateriasPrimas);
router.get('/alertas/stock-bajo', getAlertasStockBajo);
router.get('/search', searchMateriasPrimas);
router.get('/:id', getMateriaPrimaById);
router.post('/', createMateriaPrima);
router.put('/:id', updateMateriaPrima);
router.delete('/:id', deleteMateriaPrima);
router.patch('/:id/stock', updateStock);

export default router;
