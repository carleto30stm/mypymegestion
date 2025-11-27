import express from 'express';
import {
    crearOrden,
    enviarOrden,
    recibirOrden,
    obtenerOrdenes,
    obtenerOrdenPorId,
    actualizarOrden
} from '../controllers/ordenProcesamientoController.js';
import { protect } from '../middleware/authMiddleware.js'; // Asumiendo que existe este middleware

const router = express.Router();

router.use(protect); // Proteger todas las rutas

router.route('/')
    .post(crearOrden)
    .get(obtenerOrdenes);

router.route('/:id')
    .get(obtenerOrdenPorId)
    .put(actualizarOrden);

router.route('/:id/enviar')
    .post(enviarOrden);

router.route('/:id/recibir')
    .post(recibirOrden);

export default router;
