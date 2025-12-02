import { Router } from 'express';
import { 
  generarDatosF931,
  exportarF931TXT,
  previewF931,
  getHistorialF931
} from '../controllers/f931Controller.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

/**
 * Rutas para Formulario 931 AFIP
 * Declaración Jurada de Aportes y Contribuciones (SIPA)
 * 
 * Todas las rutas requieren autenticación
 * Las rutas de generación y exportación requieren rol admin
 */

// Preview - disponible para usuarios autenticados
router.get('/preview/:periodoId', protect, previewF931);

// Historial - disponible para usuarios autenticados
router.get('/historial', protect, getHistorialF931);

// Generar datos completos F931 - solo admin
router.get('/generar/:periodoId', protect, adminAuth, generarDatosF931);

// Exportar en formato TXT para SICOSS - solo admin
router.get('/exportar-txt/:periodoId', protect, adminAuth, exportarF931TXT);

export default router;
