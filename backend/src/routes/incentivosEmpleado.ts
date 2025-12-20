import express from 'express';
import IncentivoEmpleado, { TIPOS_INCENTIVO } from '../models/IncentivoEmpleado.js';
import Employee from '../models/Employee.js';

const router = express.Router();

// @desc    Obtener tipos de incentivo disponibles
// @route   GET /api/incentivos-empleado/tipos
// @access  Public
router.get('/tipos', async (_req, res) => {
  try {
    res.json(TIPOS_INCENTIVO);
  } catch (error) {
    console.error('Error al obtener tipos de incentivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Obtener todos los incentivos (con filtros opcionales)
// @route   GET /api/incentivos-empleado
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { empleadoId, periodoAplicacion, estado, tipo } = req.query;
    
    const filter: any = {};
    
    if (empleadoId) filter.empleadoId = empleadoId;
    if (periodoAplicacion) filter.periodoAplicacion = periodoAplicacion;
    if (estado) filter.estado = estado;
    if (tipo) filter.tipo = tipo;

    const incentivos = await IncentivoEmpleado.find(filter)
      .populate('empleadoId', 'nombre apellido documento sueldoBase')
      .populate('creadoPor', 'nombre')
      .sort({ fecha: -1 });
    
    // Calcular monto real si es porcentaje
    const incentivosConMonto = incentivos.map(i => {
      const incentivo = i.toObject();
      if (incentivo.esPorcentaje && incentivo.empleadoId) {
        const empleado = incentivo.empleadoId as any;
        incentivo.montoCalculado = (empleado.sueldoBase * incentivo.monto) / 100;
      } else {
        incentivo.montoCalculado = incentivo.monto;
      }
      return incentivo;
    });
    
    res.json(incentivosConMonto);
  } catch (error) {
    console.error('Error al obtener incentivos:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// @desc    Obtener incentivos por empleado
// @route   GET /api/incentivos-empleado/empleado/:empleadoId
// @access  Public
router.get('/empleado/:empleadoId', async (req, res) => {
  try {
    // Obtener el sueldo base del empleado
    const empleado = await Employee.findById(req.params.empleadoId).select('sueldoBase');
    const sueldoBase = empleado?.sueldoBase || 0;

    const incentivos = await IncentivoEmpleado.find({ empleadoId: req.params.empleadoId })
      .populate('creadoPor', 'nombre')
      .sort({ fecha: -1 });
    
    // Calcular monto real si es porcentaje
    const incentivosConMonto = incentivos.map(i => {
      const incentivo = i.toObject();
      if (incentivo.esPorcentaje) {
        incentivo.montoCalculado = (sueldoBase * incentivo.monto) / 100;
      } else {
        incentivo.montoCalculado = incentivo.monto;
      }
      return incentivo;
    });
    
    res.json(incentivosConMonto);
  } catch (error) {
    console.error('Error al obtener incentivos del empleado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Obtener incentivos por período
// @route   GET /api/incentivos-empleado/periodo/:periodo
// @access  Public
router.get('/periodo/:periodo', async (req, res) => {
  try {
    const incentivos = await IncentivoEmpleado.find({ 
      periodoAplicacion: req.params.periodo,
      estado: { $ne: 'anulado' }
    })
      .populate('empleadoId', 'nombre apellido documento sueldoBase')
      .sort({ fecha: -1 });
    
    // Calcular monto real si es porcentaje
    const incentivosConMonto = incentivos.map(i => {
      const incentivo = i.toObject();
      if (incentivo.esPorcentaje && incentivo.empleadoId) {
        const empleado = incentivo.empleadoId as any;
        incentivo.montoCalculado = (empleado.sueldoBase * incentivo.monto) / 100;
      } else {
        incentivo.montoCalculado = incentivo.monto;
      }
      return incentivo;
    });
    
    res.json(incentivosConMonto);
  } catch (error) {
    console.error('Error al obtener incentivos del período:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Obtener un incentivo por ID
// @route   GET /api/incentivos-empleado/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const incentivo = await IncentivoEmpleado.findById(req.params.id)
      .populate('empleadoId', 'nombre apellido documento sueldoBase')
      .populate('creadoPor', 'nombre');
    
    if (!incentivo) {
      return res.status(404).json({ message: 'Incentivo no encontrado' });
    }
    
    res.json(incentivo);
  } catch (error) {
    console.error('Error al obtener incentivo:', error);
    if (error instanceof Error && error.name === 'CastError') {
      return res.status(400).json({ message: 'ID de incentivo inválido' });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Crear nuevo incentivo
// @route   POST /api/incentivos-empleado
// @access  Public
router.post('/', async (req, res) => {
  try {
    const {
      empleadoId,
      tipo,
      motivo,
      monto,
      esPorcentaje,
      fecha,
      periodoId,
      periodoAplicacion,
      estado,
      observaciones
    } = req.body;

    // Validaciones básicas
    if (!empleadoId || !tipo || !motivo || monto === undefined || !periodoId) {
      return res.status(400).json({ 
        message: 'Campos requeridos: empleadoId, tipo, motivo, monto, periodoId (período activo)'
      });
    }

    // Verificar que el empleado existe
    const empleado = await Employee.findById(empleadoId);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Verificar que el período existe y está abierto
    const LiquidacionPeriodo = (await import('../models/LiquidacionPeriodo.js')).default;
    const periodoDoc = await LiquidacionPeriodo.findById(periodoId);
    if (!periodoDoc) {
      return res.status(404).json({ message: 'Período seleccionado no encontrado' });
    }
    if (periodoDoc.estado !== 'abierto') {
      return res.status(400).json({ message: 'El período seleccionado no está abierto' });
    }

    // Derivar periodoAplicacion desde la fecha de inicio del periodo
    const derivedPeriodoAplicacion = periodoDoc.fechaInicio instanceof Date
      ? periodoDoc.fechaInicio.toISOString().slice(0,7)
      : new Date(periodoDoc.fechaInicio).toISOString().slice(0,7);

    const incentivo = new IncentivoEmpleado({
      empleadoId,
      tipo,
      motivo: motivo.trim(),
      monto: Number(monto),
      esPorcentaje: esPorcentaje || false,
      fecha: fecha ? new Date(fecha) : new Date(),
      periodoAplicacion: derivedPeriodoAplicacion,
      periodoId,
      estado: estado || 'pendiente',
      observaciones: observaciones?.trim(),
      creadoPor: (req as any).user?.username || (req as any).user?._id
    });

    const savedIncentivo = await incentivo.save();
    
    // Poblar datos para la respuesta
    const populatedIncentivo = await IncentivoEmpleado.findById(savedIncentivo._id)
      .populate('empleadoId', 'nombre apellido documento');

    res.status(201).json(populatedIncentivo);
  } catch (error) {
    console.error('Error al crear incentivo:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationErrors = Object.values((error as any).errors).map((err: any) => err.message);
      return res.status(400).json({ 
        message: 'Error de validación',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Actualizar incentivo
// @route   PUT /api/incentivos-empleado/:id
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const incentivo = await IncentivoEmpleado.findById(req.params.id);
    
    if (!incentivo) {
      return res.status(404).json({ message: 'Incentivo no encontrado' });
    }

    // No permitir editar incentivos ya pagados
    if (incentivo.estado === 'pagado') {
      return res.status(400).json({ 
        message: 'No se puede editar un incentivo ya pagado' 
      });
    }

    const {
      tipo,
      motivo,
      monto,
      esPorcentaje,
      fecha,
      periodoAplicacion,
      periodoId,
      estado,
      observaciones
    } = req.body;

    if (tipo) incentivo.tipo = tipo;
    if (motivo) incentivo.motivo = motivo.trim();
    if (monto !== undefined) incentivo.monto = Number(monto);
    if (esPorcentaje !== undefined) incentivo.esPorcentaje = esPorcentaje;
    if (fecha) incentivo.fecha = new Date(fecha);

    if (periodoId) {
      const LiquidacionPeriodo = (await import('../models/LiquidacionPeriodo.js')).default;
      const periodoDoc = await LiquidacionPeriodo.findById(periodoId);
      if (!periodoDoc) return res.status(404).json({ message: 'Período seleccionado no encontrado' });
      if (periodoDoc.estado !== 'abierto') return res.status(400).json({ message: 'El período seleccionado no está abierto' });
      incentivo.periodoId = periodoId;
      incentivo.periodoAplicacion = periodoDoc.fechaInicio instanceof Date ? periodoDoc.fechaInicio.toISOString().slice(0,7) : new Date(periodoDoc.fechaInicio).toISOString().slice(0,7);
    } else if (periodoAplicacion) {
      if (!/^\d{4}-\d{2}$/.test(periodoAplicacion)) {
        return res.status(400).json({ message: 'El período debe tener formato YYYY-MM' });
      }
      incentivo.periodoAplicacion = periodoAplicacion;
    }

    if (estado) incentivo.estado = estado;
    if (observaciones !== undefined) incentivo.observaciones = observaciones?.trim();

    const updatedIncentivo = await incentivo.save();
    
    const populatedIncentivo = await IncentivoEmpleado.findById(updatedIncentivo._id)
      .populate('empleadoId', 'nombre apellido documento');

    res.json(populatedIncentivo);
  } catch (error) {
    console.error('Error al actualizar incentivo:', error);
    
    if (error instanceof Error && error.name === 'CastError') {
      return res.status(400).json({ message: 'ID de incentivo inválido' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Cambiar estado del incentivo
// @route   PATCH /api/incentivos-empleado/:id/estado
// @access  Public
router.patch('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    
    if (!estado || !['pendiente', 'pagado', 'anulado'].includes(estado)) {
      return res.status(400).json({ 
        message: 'Estado inválido. Debe ser: pendiente, pagado o anulado' 
      });
    }

    const incentivo = await IncentivoEmpleado.findById(req.params.id);
    
    if (!incentivo) {
      return res.status(404).json({ message: 'Incentivo no encontrado' });
    }

    incentivo.estado = estado;
    await incentivo.save();

    const populatedIncentivo = await IncentivoEmpleado.findById(incentivo._id)
      .populate('empleadoId', 'nombre apellido documento');

    res.json(populatedIncentivo);
  } catch (error) {
    console.error('Error al cambiar estado del incentivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Eliminar incentivo
// @route   DELETE /api/incentivos-empleado/:id
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const incentivo = await IncentivoEmpleado.findById(req.params.id);
    
    if (!incentivo) {
      return res.status(404).json({ message: 'Incentivo no encontrado' });
    }

    // No permitir eliminar incentivos ya pagados
    if (incentivo.estado === 'pagado') {
      return res.status(400).json({ 
        message: 'No se puede eliminar un incentivo ya pagado. Anúlelo en su lugar.' 
      });
    }

    await IncentivoEmpleado.findByIdAndDelete(req.params.id);
    res.json({ 
      message: 'Incentivo eliminado exitosamente',
      incentivo: {
        tipo: incentivo.tipo,
        monto: incentivo.monto
      }
    });
  } catch (error) {
    console.error('Error al eliminar incentivo:', error);
    
    if (error instanceof Error && error.name === 'CastError') {
      return res.status(400).json({ message: 'ID de incentivo inválido' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Obtener resumen de incentivos por período
// @route   GET /api/incentivos-empleado/resumen/:periodo
// @access  Public
router.get('/resumen/:periodo', async (req, res) => {
  try {
    const resumen = await IncentivoEmpleado.aggregate([
      {
        $match: {
          periodoAplicacion: req.params.periodo,
          estado: { $ne: 'anulado' }
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: 'empleadoId',
          foreignField: '_id',
          as: 'empleado'
        }
      },
      {
        $unwind: '$empleado'
      },
      {
        $addFields: {
          montoCalculado: {
            $cond: {
              if: '$esPorcentaje',
              then: { $multiply: ['$empleado.sueldoBase', { $divide: ['$monto', 100] }] },
              else: '$monto'
            }
          }
        }
      },
      {
        $group: {
          _id: '$empleadoId',
          empleado: { $first: '$empleado' },
          totalIncentivos: { $sum: '$montoCalculado' },
          cantidadIncentivos: { $sum: 1 },
          incentivos: {
            $push: {
              tipo: '$tipo',
              motivo: '$motivo',
              monto: '$montoCalculado',
              estado: '$estado'
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          empleadoNombre: { $concat: ['$empleado.nombre', ' ', '$empleado.apellido'] },
          totalIncentivos: 1,
          cantidadIncentivos: 1,
          incentivos: 1
        }
      }
    ]);

    const totalGeneral = resumen.reduce((sum, emp) => sum + emp.totalIncentivos, 0);

    res.json({
      periodo: req.params.periodo,
      totalGeneral,
      empleados: resumen
    });
  } catch (error) {
    console.error('Error al obtener resumen de incentivos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
