import express from 'express';
import {
  getGastos,
  createGasto,
  updateGasto,
  deleteGasto
} from '../controllers/gastosControllers.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireEditDeletePermission } from '../middleware/operAuth.js';

const router = express.Router();

router.route('/')
  .get( getGastos)
  .post( createGasto); // OPER puede crear gastos
  // .get(protect, getGastos)
  // .post(protect, createGasto); // OPER puede crear gastos
  // TODO: agregar el protected si se usa JWDT a confirmar
router.route('/:id')
  .put( updateGasto)    // OPER NO puede editar
  .delete(  deleteGasto); // OPER NO puede eliminar

export default router;
