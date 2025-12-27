import express from 'express';
import {
    abrirCaja,
    cerrarCaja,
    getEstadoCaja,
    getHistorialCaja
} from '../controllers/cajaController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren estar logueado
router.use(protect);

router.post('/abrir', abrirCaja);
router.post('/cerrar', cerrarCaja);
router.get('/estado', getEstadoCaja);
router.get('/historial', getHistorialCaja);

export default router;
