import { Router } from 'express';
import {
  generarLibroSueldos,
  exportarLibroTXT,
  exportarLibroExcel,
  previewLibroSueldos,
  getHistorialLibros
} from '../controllers/libroSueldosController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

/**
 * Rutas del Libro de Sueldos Digital
 * 
 * RG AFIP 4003/2017
 * Registro obligatorio de remuneraciones en formato digital
 * 
 * Todas las rutas requieren autenticación
 * Las rutas de generación y exportación requieren rol admin
 */

// Preview - disponible para usuarios autenticados
router.get('/preview/:periodoId', protect, previewLibroSueldos);

// Historial - disponible para usuarios autenticados
router.get('/historial', protect, getHistorialLibros);

// Generar libro completo en JSON - solo admin
router.get('/generar/:periodoId', protect, adminAuth, generarLibroSueldos);

// Exportar en formato TXT para AFIP - solo admin
router.get('/exportar-txt/:periodoId', protect, adminAuth, exportarLibroTXT);

// Exportar en formato Excel/CSV - solo admin
router.get('/exportar-excel/:periodoId', protect, adminAuth, exportarLibroExcel);

export default router;
