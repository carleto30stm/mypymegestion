import type { Request, Response } from 'express';
import Convenio from '../models/Convenio.js';
import Employee from '../models/Employee.js';

// =====================================================
// CONTROLADORES DE CONVENIOS
// =====================================================

/**
 * Obtener todos los convenios
 */
export const getConvenios = async (req: Request, res: Response) => {
  try {
    const { estado, busqueda } = req.query;
    
    const filtro: any = {};
    
    if (estado) filtro.estado = estado;
    if (busqueda) {
      filtro.$or = [
        { nombre: { $regex: busqueda, $options: 'i' } },
        { numero: { $regex: busqueda, $options: 'i' } },
        { sindicato: { $regex: busqueda, $options: 'i' } }
      ];
    }
    
    const convenios = await Convenio.find(filtro)
      .sort({ nombre: 1 })
      .select('-historialAjustes'); // Excluir historial para listado
    
    res.json(convenios);
  } catch (error) {
    console.error('Error al obtener convenios:', error);
    res.status(500).json({ message: 'Error al obtener convenios' });
  }
};

/**
 * Obtener un convenio por ID
 */
export const getConvenioById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const convenio = await Convenio.findById(id);
    
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    
    res.json(convenio);
  } catch (error) {
    console.error('Error al obtener convenio:', error);
    res.status(500).json({ message: 'Error al obtener convenio' });
  }
};

/**
 * Crear nuevo convenio
 */
export const crearConvenio = async (req: Request, res: Response) => {
  try {
    const {
      numero,
      nombre,
      descripcion,
      rama,
      sindicato,
      fechaVigenciaDesde,
      fechaVigenciaHasta,
      categorias,
      adicionalesGenerales,
      jornadaCompleta,
      horasExtras50,
      horasExtras100,
      observaciones
    } = req.body;
    
    // Verificar que no exista un convenio con el mismo número
    const existente = await Convenio.findOne({ numero });
    if (existente) {
      return res.status(400).json({ message: `Ya existe un convenio con el número ${numero}` });
    }
    
    // Ordenar categorías por su campo 'orden'
    const categoriasOrdenadas = (categorias || []).map((cat: any, index: number) => ({
      ...cat,
      orden: cat.orden ?? index + 1,
      activa: cat.activa ?? true
    }));
    
    const convenio = new Convenio({
      numero,
      nombre,
      descripcion,
      rama,
      sindicato,
      fechaVigenciaDesde: new Date(fechaVigenciaDesde),
      fechaVigenciaHasta: fechaVigenciaHasta ? new Date(fechaVigenciaHasta) : undefined,
      estado: 'vigente',
      categorias: categoriasOrdenadas,
      adicionalesGenerales: adicionalesGenerales || {
        presentismo: { activo: true, porcentaje: 8.33 },
        antiguedad: { activo: true, porcentajePorAnio: 1, aplicaSobre: 'basico' }
      },
      jornadaCompleta: jornadaCompleta || 48,
      horasExtras50: horasExtras50 || 50,
      horasExtras100: horasExtras100 || 100,
      observaciones
    });
    
    await convenio.save();
    
    res.status(201).json(convenio);
  } catch (error) {
    console.error('Error al crear convenio:', error);
    res.status(500).json({ message: 'Error al crear convenio' });
  }
};

/**
 * Actualizar convenio
 */
export const actualizarConvenio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actualizaciones = req.body;
    
    const convenio = await Convenio.findById(id);
    
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    
    // No permitir cambiar el número si ya hay empleados asignados
    if (actualizaciones.numero && actualizaciones.numero !== convenio.numero) {
      const empleadosConConvenio = await Employee.countDocuments({ convenioId: id });
      if (empleadosConConvenio > 0) {
        return res.status(400).json({ 
          message: `No se puede cambiar el número del convenio porque hay ${empleadosConConvenio} empleados asignados` 
        });
      }
    }
    
    Object.assign(convenio, actualizaciones);
    await convenio.save();
    
    res.json(convenio);
  } catch (error) {
    console.error('Error al actualizar convenio:', error);
    res.status(500).json({ message: 'Error al actualizar convenio' });
  }
};

/**
 * Eliminar convenio (soft delete - cambiar estado)
 */
export const eliminarConvenio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay empleados asignados
    const empleadosConConvenio = await Employee.countDocuments({ convenioId: id });
    if (empleadosConConvenio > 0) {
      return res.status(400).json({ 
        message: `No se puede eliminar el convenio porque hay ${empleadosConConvenio} empleados asignados. Primero reasigne los empleados.` 
      });
    }
    
    const convenio = await Convenio.findByIdAndDelete(id);
    
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    
    res.json({ message: 'Convenio eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar convenio:', error);
    res.status(500).json({ message: 'Error al eliminar convenio' });
  }
};

// =====================================================
// GESTIÓN DE CATEGORÍAS
// =====================================================

/**
 * Obtener categorías de un convenio
 */
export const getCategoriasConvenio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { soloActivas } = req.query;
    
    const convenio = await Convenio.findById(id).select('categorias nombre numero');
    
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    
    let categorias = convenio.categorias;
    if (soloActivas === 'true') {
      categorias = categorias.filter(c => c.activa);
    }
    
    // Ordenar por campo 'orden'
    categorias.sort((a, b) => a.orden - b.orden);
    
    res.json({
      convenio: { id: convenio._id, nombre: convenio.nombre, numero: convenio.numero },
      categorias
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error al obtener categorías' });
  }
};

/**
 * Agregar categoría a un convenio
 */
export const agregarCategoria = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, descripcion, salarioBasico, adicionales, orden } = req.body;
    
    const convenio = await Convenio.findById(id);
    
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    
    // Verificar que no exista una categoría con el mismo código
    const existente = convenio.categorias.find(c => c.codigo === codigo);
    if (existente) {
      return res.status(400).json({ message: `Ya existe una categoría con código ${codigo}` });
    }
    
    const nuevaCategoria = {
      codigo,
      nombre,
      descripcion,
      salarioBasico,
      adicionales: adicionales || [],
      orden: orden ?? convenio.categorias.length + 1,
      activa: true
    };
    
    convenio.categorias.push(nuevaCategoria);
    await convenio.save();
    
    res.status(201).json(nuevaCategoria);
  } catch (error) {
    console.error('Error al agregar categoría:', error);
    res.status(500).json({ message: 'Error al agregar categoría' });
  }
};

/**
 * Actualizar categoría de un convenio
 */
export const actualizarCategoria = async (req: Request, res: Response) => {
  try {
    const { id, codigoCategoria } = req.params;
    const actualizaciones = req.body;
    
    const convenio = await Convenio.findById(id);
    
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    
    const categoriaIndex = convenio.categorias.findIndex(c => c.codigo === codigoCategoria);
    if (categoriaIndex === -1) {
      return res.status(404).json({ message: `Categoría ${codigoCategoria} no encontrada` });
    }
    
    // No permitir cambiar el código si hay empleados asignados
    if (actualizaciones.codigo && actualizaciones.codigo !== codigoCategoria) {
      const empleadosConCategoria = await Employee.countDocuments({ 
        convenioId: id, 
        categoriaConvenio: codigoCategoria 
      });
      if (empleadosConCategoria > 0) {
        return res.status(400).json({ 
          message: `No se puede cambiar el código porque hay ${empleadosConCategoria} empleados asignados a esta categoría` 
        });
      }
    }
    
    const categoriaActual = convenio.categorias[categoriaIndex];
    if (categoriaActual) {
      Object.assign(categoriaActual, actualizaciones);
    }
    await convenio.save();
    
    res.json(convenio.categorias[categoriaIndex]);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ message: 'Error al actualizar categoría' });
  }
};

/**
 * Desactivar categoría (soft delete)
 */
export const desactivarCategoria = async (req: Request, res: Response) => {
  try {
    const { id, codigoCategoria } = req.params;
    
    const convenio = await Convenio.findById(id);
    
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    
    const categoria = convenio.categorias.find(c => c.codigo === codigoCategoria);
    if (!categoria) {
      return res.status(404).json({ message: `Categoría ${codigoCategoria} no encontrada` });
    }
    
    // Verificar si hay empleados asignados
    const empleadosConCategoria = await Employee.countDocuments({ 
      convenioId: id, 
      categoriaConvenio: codigoCategoria 
    });
    if (empleadosConCategoria > 0) {
      return res.status(400).json({ 
        message: `No se puede desactivar porque hay ${empleadosConCategoria} empleados asignados. Primero reasígnelos.` 
      });
    }
    
    categoria.activa = false;
    await convenio.save();
    
    res.json({ message: `Categoría ${codigoCategoria} desactivada`, categoria });
  } catch (error) {
    console.error('Error al desactivar categoría:', error);
    res.status(500).json({ message: 'Error al desactivar categoría' });
  }
};

// =====================================================
// PARITARIAS Y AJUSTES
// =====================================================

/**
 * Registrar aumento/paritaria
 */
export const registrarAumento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      porcentajeAumento, 
      montoFijo,
      tipoAjuste, 
      descripcion, 
      aplicadoA = 'todas',
      retroactivo = false,
      fechaRetroactiva,
      registradoPor
    } = req.body;
    
    const convenio = await Convenio.findById(id);
    
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    
    // Validar categorías si no es 'todas'
    if (aplicadoA !== 'todas' && Array.isArray(aplicadoA)) {
      const codigosExistentes = convenio.categorias.map(c => c.codigo);
      const codigosInvalidos = aplicadoA.filter(c => !codigosExistentes.includes(c));
      if (codigosInvalidos.length > 0) {
        return res.status(400).json({ 
          message: `Categorías no encontradas: ${codigosInvalidos.join(', ')}` 
        });
      }
    }
    
    // Aplicar aumento a las categorías correspondientes
    const categoriasAAjustar = aplicadoA === 'todas' 
      ? convenio.categorias 
      : convenio.categorias.filter(c => (aplicadoA as string[]).includes(c.codigo));
    
    const salariosPrevios: { codigo: string; anterior: number; nuevo: number }[] = [];
    
    for (const categoria of categoriasAAjustar) {
      const anterior = categoria.salarioBasico;
      
      // Aplicar porcentaje
      let nuevoSalario = categoria.salarioBasico * (1 + porcentajeAumento / 100);
      
      // Aplicar monto fijo si existe
      if (montoFijo) {
        nuevoSalario += montoFijo;
      }
      
      categoria.salarioBasico = Math.round(nuevoSalario);
      
      salariosPrevios.push({
        codigo: categoria.codigo,
        anterior,
        nuevo: categoria.salarioBasico
      });
    }
    
    // Registrar en historial
    const nuevoAjuste: any = {
      fecha: new Date(),
      tipoAjuste,
      porcentajeAumento,
      montoFijo,
      descripcion,
      aplicadoA,
      retroactivo,
      registradoPor
    };
    if (retroactivo && fechaRetroactiva) {
      nuevoAjuste.fechaRetroactiva = new Date(fechaRetroactiva);
    }
    convenio.historialAjustes.push(nuevoAjuste);
    
    await convenio.save();
    
    // Opcional: Actualizar sueldo base de empleados afectados
    // Esto se puede hacer automáticamente o manualmente según preferencia
    
    res.json({
      message: `Aumento del ${porcentajeAumento}%${montoFijo ? ` + $${montoFijo}` : ''} aplicado correctamente`,
      categoriasAfectadas: salariosPrevios,
      convenio
    });
  } catch (error) {
    console.error('Error al registrar aumento:', error);
    res.status(500).json({ message: 'Error al registrar aumento' });
  }
};

/**
 * Obtener historial de ajustes de un convenio
 */
export const getHistorialAjustes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const convenio = await Convenio.findById(id).select('historialAjustes nombre numero');
    
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    
    // Ordenar por fecha descendente
    const historial = convenio.historialAjustes.sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    
    res.json({
      convenio: { id: convenio._id, nombre: convenio.nombre, numero: convenio.numero },
      historial
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error al obtener historial de ajustes' });
  }
};

// =====================================================
// CÁLCULOS
// =====================================================

/**
 * Calcular sueldo de un empleado según convenio y categoría
 */
export const calcularSueldoEmpleado = async (req: Request, res: Response) => {
  try {
    const { convenioId, codigoCategoria, antiguedadAnios, aplicaPresentismo = true, zonaPeligrosa = false, nivelTitulo } = req.body;
    
    const convenio = await Convenio.findById(convenioId);
    
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    
    const categoria = convenio.categorias.find(c => c.codigo === codigoCategoria);
    if (!categoria) {
      return res.status(404).json({ message: `Categoría ${codigoCategoria} no encontrada` });
    }
    
    // Usar el método del modelo
    const calculo = (convenio as any).calcularSueldoCategoria(
      codigoCategoria,
      antiguedadAnios || 0,
      aplicaPresentismo,
      zonaPeligrosa,
      nivelTitulo
    );
    
    res.json({
      convenio: { id: convenio._id, nombre: convenio.nombre, numero: convenio.numero },
      categoria: { codigo: categoria.codigo, nombre: categoria.nombre },
      calculo
    });
  } catch (error) {
    console.error('Error al calcular sueldo:', error);
    res.status(500).json({ message: 'Error al calcular sueldo' });
  }
};

/**
 * Sincronizar sueldos de empleados con el convenio
 * Actualiza el sueldo base de todos los empleados según su categoría en el convenio
 */
export const sincronizarSueldosConvenio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { aplicarAutomaticamente = false } = req.body;
    
    const convenio = await Convenio.findById(id);
    
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    
    // Obtener empleados con este convenio
    const empleados = await Employee.find({ 
      convenioId: id,
      estado: 'activo'
    });
    
    const diferencias: {
      empleadoId: string;
      nombre: string;
      categoriaConvenio: string;
      sueldoActual: number;
      sueldoConvenio: number;
      diferencia: number;
    }[] = [];
    
    for (const empleado of empleados) {
      if (!empleado.categoriaConvenio) continue;
      
      const categoria = convenio.categorias.find(c => c.codigo === empleado.categoriaConvenio);
      if (!categoria) continue;
      
      const sueldoConvenio = categoria.salarioBasico;
      
      if (empleado.sueldoBase !== sueldoConvenio) {
        diferencias.push({
          empleadoId: (empleado._id as any).toString(),
          nombre: `${empleado.apellido}, ${empleado.nombre}`,
          categoriaConvenio: empleado.categoriaConvenio,
          sueldoActual: empleado.sueldoBase,
          sueldoConvenio,
          diferencia: sueldoConvenio - empleado.sueldoBase
        });
        
        // Aplicar cambio si se solicita
        if (aplicarAutomaticamente) {
          empleado.sueldoBase = sueldoConvenio;
          await empleado.save();
        }
      }
    }
    
    res.json({
      convenio: { id: convenio._id, nombre: convenio.nombre },
      totalEmpleados: empleados.length,
      empleadosConDiferencia: diferencias.length,
      diferencias,
      aplicado: aplicarAutomaticamente
    });
  } catch (error) {
    console.error('Error al sincronizar sueldos:', error);
    res.status(500).json({ message: 'Error al sincronizar sueldos' });
  }
};

/**
 * Obtener empleados por convenio
 */
export const getEmpleadosPorConvenio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const convenio = await Convenio.findById(id).select('nombre numero categorias');
    
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    
    const empleados = await Employee.find({ convenioId: id })
      .select('nombre apellido documento categoriaConvenio sueldoBase estado')
      .sort({ apellido: 1, nombre: 1 });
    
    // Agregar info de categoría a cada empleado
    const empleadosConCategoria = empleados.map(emp => {
      const categoria = convenio.categorias.find(c => c.codigo === emp.categoriaConvenio);
      return {
        ...emp.toObject(),
        categoriaNombre: categoria?.nombre || 'Sin categoría',
        salarioCategoria: categoria?.salarioBasico || 0,
        diferenciaSueldo: emp.sueldoBase - (categoria?.salarioBasico || 0)
      };
    });
    
    res.json({
      convenio: { id: convenio._id, nombre: convenio.nombre, numero: convenio.numero },
      totalEmpleados: empleados.length,
      empleados: empleadosConCategoria
    });
  } catch (error) {
    console.error('Error al obtener empleados por convenio:', error);
    res.status(500).json({ message: 'Error al obtener empleados por convenio' });
  }
};

// =====================================================
// PARITARIAS GLOBALES Y ALERTAS
// =====================================================

/**
 * Obtener todas las paritarias de todos los convenios
 * Con filtros por fecha, tipo y convenio
 */
export const getTodasLasParitarias = async (req: Request, res: Response) => {
  try {
    const { 
      desde, 
      hasta, 
      tipoAjuste, 
      convenioId,
      limite = 50,
      ordenar = 'desc' // 'asc' o 'desc' por fecha
    } = req.query;
    
    // Obtener todos los convenios con historial
    const filtroConvenio: any = {};
    if (convenioId) {
      filtroConvenio._id = convenioId;
    }
    
    const convenios = await Convenio.find(filtroConvenio)
      .select('numero nombre sindicato historialAjustes categorias');
    
    // Aplanar todos los ajustes con info del convenio
    let todasLasParitarias: any[] = [];
    
    for (const convenio of convenios) {
      for (const ajuste of convenio.historialAjustes) {
        todasLasParitarias.push({
          _id: (ajuste as any)._id,
          convenioId: convenio._id,
          convenioNumero: convenio.numero,
          convenioNombre: convenio.nombre,
          sindicato: convenio.sindicato,
          fecha: ajuste.fecha,
          tipoAjuste: ajuste.tipoAjuste,
          porcentajeAumento: ajuste.porcentajeAumento,
          montoFijo: ajuste.montoFijo,
          descripcion: ajuste.descripcion,
          aplicadoA: ajuste.aplicadoA,
          retroactivo: ajuste.retroactivo,
          fechaRetroactiva: ajuste.fechaRetroactiva,
          registradoPor: ajuste.registradoPor
        });
      }
    }
    
    // Aplicar filtros
    if (desde) {
      const fechaDesde = new Date(desde as string);
      todasLasParitarias = todasLasParitarias.filter(p => new Date(p.fecha) >= fechaDesde);
    }
    
    if (hasta) {
      const fechaHasta = new Date(hasta as string);
      todasLasParitarias = todasLasParitarias.filter(p => new Date(p.fecha) <= fechaHasta);
    }
    
    if (tipoAjuste) {
      todasLasParitarias = todasLasParitarias.filter(p => p.tipoAjuste === tipoAjuste);
    }
    
    // Ordenar por fecha
    todasLasParitarias.sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      return ordenar === 'asc' ? fechaA - fechaB : fechaB - fechaA;
    });
    
    // Limitar resultados
    const limitNum = parseInt(limite as string) || 50;
    todasLasParitarias = todasLasParitarias.slice(0, limitNum);
    
    // Estadísticas
    const estadisticas = {
      totalParitarias: todasLasParitarias.length,
      porTipo: {
        paritaria: todasLasParitarias.filter(p => p.tipoAjuste === 'paritaria').length,
        decreto: todasLasParitarias.filter(p => p.tipoAjuste === 'decreto').length,
        acuerdo: todasLasParitarias.filter(p => p.tipoAjuste === 'acuerdo').length,
        otro: todasLasParitarias.filter(p => p.tipoAjuste === 'otro').length
      },
      promedioAumento: todasLasParitarias.length > 0
        ? (todasLasParitarias.reduce((sum, p) => sum + p.porcentajeAumento, 0) / todasLasParitarias.length).toFixed(2)
        : 0
    };
    
    res.json({
      paritarias: todasLasParitarias,
      estadisticas
    });
  } catch (error) {
    console.error('Error al obtener paritarias:', error);
    res.status(500).json({ message: 'Error al obtener paritarias' });
  }
};

/**
 * Obtener alertas de paritarias
 * - Convenios sin ajustes en X meses
 * - Próximas fechas de negociación (si se registran)
 * - Diferencias salariales con empleados
 */
export const getAlertasParitarias = async (req: Request, res: Response) => {
  try {
    const { mesesSinAjuste = 6 } = req.query;
    
    const mesesLimite = parseInt(mesesSinAjuste as string) || 6;
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - mesesLimite);
    
    const convenios = await Convenio.find({ estado: 'vigente' })
      .select('numero nombre sindicato historialAjustes categorias fechaVigenciaHasta');
    
    const alertas: {
      tipo: 'sin_ajuste' | 'vencimiento_proximo' | 'diferencia_salarial' | 'sin_historial';
      prioridad: 'alta' | 'media' | 'baja';
      convenioId: string;
      convenioNombre: string;
      convenioNumero: string;
      mensaje: string;
      detalle?: any;
    }[] = [];
    
    for (const convenio of convenios) {
      const convenioIdStr = (convenio._id as any).toString();
      
      // 1. Convenios sin historial de ajustes
      if (convenio.historialAjustes.length === 0) {
        alertas.push({
          tipo: 'sin_historial',
          prioridad: 'media',
          convenioId: convenioIdStr,
          convenioNombre: convenio.nombre,
          convenioNumero: convenio.numero,
          mensaje: `El convenio ${convenio.numero} no tiene historial de ajustes registrado`,
          detalle: { sindicato: convenio.sindicato }
        });
        continue;
      }
      
      // 2. Último ajuste hace más de X meses
      const ajustesOrdenados = [...convenio.historialAjustes].sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      const ultimoAjuste = ajustesOrdenados[0];
      
      if (ultimoAjuste && new Date(ultimoAjuste.fecha) < fechaLimite) {
        const mesesTranscurridos = Math.floor(
          (Date.now() - new Date(ultimoAjuste.fecha).getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        
        alertas.push({
          tipo: 'sin_ajuste',
          prioridad: mesesTranscurridos > 12 ? 'alta' : 'media',
          convenioId: convenioIdStr,
          convenioNombre: convenio.nombre,
          convenioNumero: convenio.numero,
          mensaje: `Sin ajustes en ${mesesTranscurridos} meses (último: ${ultimoAjuste.tipoAjuste} del ${new Date(ultimoAjuste.fecha).toLocaleDateString('es-AR')})`,
          detalle: {
            ultimoAjuste: ultimoAjuste.fecha,
            tipoUltimoAjuste: ultimoAjuste.tipoAjuste,
            porcentajeUltimoAjuste: ultimoAjuste.porcentajeAumento,
            mesesTranscurridos
          }
        });
      }
      
      // 3. Vencimiento próximo del convenio (si tiene fecha de vencimiento)
      if (convenio.fechaVigenciaHasta) {
        const diasParaVencer = Math.floor(
          (new Date(convenio.fechaVigenciaHasta).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        if (diasParaVencer <= 90 && diasParaVencer > 0) {
          alertas.push({
            tipo: 'vencimiento_proximo',
            prioridad: diasParaVencer <= 30 ? 'alta' : 'media',
            convenioId: convenioIdStr,
            convenioNombre: convenio.nombre,
            convenioNumero: convenio.numero,
            mensaje: `El convenio vence en ${diasParaVencer} días (${new Date(convenio.fechaVigenciaHasta).toLocaleDateString('es-AR')})`,
            detalle: {
              fechaVencimiento: convenio.fechaVigenciaHasta,
              diasRestantes: diasParaVencer
            }
          });
        } else if (diasParaVencer <= 0) {
          alertas.push({
            tipo: 'vencimiento_proximo',
            prioridad: 'alta',
            convenioId: convenioIdStr,
            convenioNombre: convenio.nombre,
            convenioNumero: convenio.numero,
            mensaje: `⚠️ El convenio está VENCIDO desde ${new Date(convenio.fechaVigenciaHasta).toLocaleDateString('es-AR')}`,
            detalle: {
              fechaVencimiento: convenio.fechaVigenciaHasta,
              diasVencido: Math.abs(diasParaVencer)
            }
          });
        }
      }
      
      // 4. Verificar diferencias salariales con empleados
      const empleados = await Employee.find({ 
        convenioId: convenio._id,
        estado: 'activo'
      }).select('nombre apellido categoriaConvenio sueldoBase');
      
      let empleadosConDiferencia = 0;
      for (const emp of empleados) {
        if (!emp.categoriaConvenio) continue;
        const categoria = convenio.categorias.find(c => c.codigo === emp.categoriaConvenio);
        if (categoria && emp.sueldoBase < categoria.salarioBasico) {
          empleadosConDiferencia++;
        }
      }
      
      if (empleadosConDiferencia > 0) {
        alertas.push({
          tipo: 'diferencia_salarial',
          prioridad: 'alta',
          convenioId: convenioIdStr,
          convenioNombre: convenio.nombre,
          convenioNumero: convenio.numero,
          mensaje: `${empleadosConDiferencia} empleado(s) con sueldo por debajo de la escala del convenio`,
          detalle: {
            empleadosAfectados: empleadosConDiferencia,
            totalEmpleados: empleados.length
          }
        });
      }
    }
    
    // Ordenar por prioridad (alta > media > baja)
    const prioridadOrden = { 'alta': 0, 'media': 1, 'baja': 2 };
    alertas.sort((a, b) => prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]);
    
    // Resumen
    const resumen = {
      totalAlertas: alertas.length,
      alta: alertas.filter(a => a.prioridad === 'alta').length,
      media: alertas.filter(a => a.prioridad === 'media').length,
      baja: alertas.filter(a => a.prioridad === 'baja').length,
      porTipo: {
        sin_ajuste: alertas.filter(a => a.tipo === 'sin_ajuste').length,
        vencimiento_proximo: alertas.filter(a => a.tipo === 'vencimiento_proximo').length,
        diferencia_salarial: alertas.filter(a => a.tipo === 'diferencia_salarial').length,
        sin_historial: alertas.filter(a => a.tipo === 'sin_historial').length
      }
    };
    
    res.json({
      alertas,
      resumen,
      configuracion: {
        mesesSinAjusteConsiderado: mesesLimite
      }
    });
  } catch (error) {
    console.error('Error al obtener alertas de paritarias:', error);
    res.status(500).json({ message: 'Error al obtener alertas de paritarias' });
  }
};

/**
 * Obtener resumen anual de paritarias
 * Útil para reportes y comparativas
 */
export const getResumenAnualParitarias = async (req: Request, res: Response) => {
  try {
    const { anio = new Date().getFullYear() } = req.query;
    const anioNum = parseInt(anio as string);
    
    const convenios = await Convenio.find()
      .select('numero nombre sindicato historialAjustes');
    
    const resumenPorConvenio: any[] = [];
    let totalAumentoAnual = 0;
    let conveniosConAumento = 0;
    
    for (const convenio of convenios) {
      const convenioIdStr = (convenio._id as any).toString();
      
      // Filtrar ajustes del año
      const ajustesDelAnio = convenio.historialAjustes.filter(a => 
        new Date(a.fecha).getFullYear() === anioNum
      );
      
      if (ajustesDelAnio.length === 0) continue;
      
      // Calcular acumulado del año
      const aumentoAcumulado = ajustesDelAnio.reduce((acc, a) => {
        // Fórmula de interés compuesto para acumular porcentajes
        return acc * (1 + a.porcentajeAumento / 100);
      }, 1);
      
      const porcentajeTotal = (aumentoAcumulado - 1) * 100;
      
      resumenPorConvenio.push({
        convenioId: convenioIdStr,
        convenioNumero: convenio.numero,
        convenioNombre: convenio.nombre,
        sindicato: convenio.sindicato,
        cantidadAjustes: ajustesDelAnio.length,
        porcentajeAcumuladoAnual: parseFloat(porcentajeTotal.toFixed(2)),
        ajustes: ajustesDelAnio.map(a => ({
          fecha: a.fecha,
          tipo: a.tipoAjuste,
          porcentaje: a.porcentajeAumento,
          descripcion: a.descripcion
        }))
      });
      
      totalAumentoAnual += porcentajeTotal;
      conveniosConAumento++;
    }
    
    // Ordenar por porcentaje acumulado descendente
    resumenPorConvenio.sort((a, b) => b.porcentajeAcumuladoAnual - a.porcentajeAcumuladoAnual);
    
    res.json({
      anio: anioNum,
      resumen: {
        conveniosConAumentos: conveniosConAumento,
        promedioAumentoAnual: conveniosConAumento > 0 
          ? parseFloat((totalAumentoAnual / conveniosConAumento).toFixed(2))
          : 0,
        convenioMayorAumento: resumenPorConvenio[0] || null,
        convenioMenorAumento: resumenPorConvenio[resumenPorConvenio.length - 1] || null
      },
      detallePorConvenio: resumenPorConvenio
    });
  } catch (error) {
    console.error('Error al obtener resumen anual:', error);
    res.status(500).json({ message: 'Error al obtener resumen anual de paritarias' });
  }
};
