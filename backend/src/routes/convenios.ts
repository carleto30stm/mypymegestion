import express from 'express';
import {
  // Convenios
  getConvenios,
  getConvenioById,
  crearConvenio,
  actualizarConvenio,
  eliminarConvenio,
  // Categorías
  getCategoriasConvenio,
  agregarCategoria,
  actualizarCategoria,
  desactivarCategoria,
  // Paritarias
  registrarAumento,
  getHistorialAjustes,
  getTodasLasParitarias,
  getAlertasParitarias,
  getResumenAnualParitarias,
  // Cálculos
  calcularSueldoEmpleado,
  sincronizarSueldosConvenio,
  getEmpleadosPorConvenio
} from '../controllers/convenioController.js';

const router = express.Router();

// =====================================================
// RUTAS GLOBALES DE PARITARIAS (deben ir ANTES de /:id)
// =====================================================

// @desc    Obtener todas las paritarias de todos los convenios
// @route   GET /api/convenios/paritarias/todas
// @query   desde, hasta, tipoAjuste, convenioId, limite, ordenar
router.get('/paritarias/todas', getTodasLasParitarias);

// @desc    Obtener alertas de paritarias
// @route   GET /api/convenios/paritarias/alertas
// @query   mesesSinAjuste (default: 6)
router.get('/paritarias/alertas', getAlertasParitarias);

// @desc    Obtener resumen anual de paritarias
// @route   GET /api/convenios/paritarias/resumen-anual
// @query   anio (default: año actual)
router.get('/paritarias/resumen-anual', getResumenAnualParitarias);

// =====================================================
// RUTAS DE CONVENIOS
// =====================================================

// @desc    Obtener todos los convenios
// @route   GET /api/convenios
router.get('/', getConvenios);

// @desc    Obtener un convenio por ID
// @route   GET /api/convenios/:id
router.get('/:id', getConvenioById);

// @desc    Crear nuevo convenio
// @route   POST /api/convenios
router.post('/', crearConvenio);

// @desc    Actualizar convenio
// @route   PUT /api/convenios/:id
router.put('/:id', actualizarConvenio);

// @desc    Eliminar convenio
// @route   DELETE /api/convenios/:id
router.delete('/:id', eliminarConvenio);

// =====================================================
// RUTAS DE CATEGORÍAS
// =====================================================

// @desc    Obtener categorías de un convenio
// @route   GET /api/convenios/:id/categorias
router.get('/:id/categorias', getCategoriasConvenio);

// @desc    Agregar categoría a un convenio
// @route   POST /api/convenios/:id/categorias
router.post('/:id/categorias', agregarCategoria);

// @desc    Actualizar categoría de un convenio
// @route   PUT /api/convenios/:id/categorias/:codigoCategoria
router.put('/:id/categorias/:codigoCategoria', actualizarCategoria);

// @desc    Desactivar categoría (soft delete)
// @route   DELETE /api/convenios/:id/categorias/:codigoCategoria
router.delete('/:id/categorias/:codigoCategoria', desactivarCategoria);

// =====================================================
// RUTAS DE PARITARIAS Y AJUSTES (por convenio)
// =====================================================

// @desc    Registrar aumento/paritaria
// @route   POST /api/convenios/:id/aumentos
router.post('/:id/aumentos', registrarAumento);

// @desc    Obtener historial de ajustes
// @route   GET /api/convenios/:id/historial
router.get('/:id/historial', getHistorialAjustes);

// =====================================================
// RUTAS DE CÁLCULOS Y SINCRONIZACIÓN
// =====================================================

// @desc    Calcular sueldo según convenio y categoría
// @route   POST /api/convenios/calcular-sueldo
router.post('/calcular-sueldo', calcularSueldoEmpleado);

// @desc    Sincronizar sueldos de empleados con convenio
// @route   POST /api/convenios/:id/sincronizar
router.post('/:id/sincronizar', sincronizarSueldosConvenio);

// @desc    Obtener empleados por convenio
// @route   GET /api/convenios/:id/empleados
router.get('/:id/empleados', getEmpleadosPorConvenio);

export default router;
