import express from 'express';
import DescuentoEmpleado, { TIPOS_DESCUENTO } from '../models/DescuentoEmpleado.js';
import Employee from '../models/Employee.js';

const router = express.Router();

// @desc    Obtener tipos de descuento disponibles
// @route   GET /api/descuentos-empleado/tipos
// @access  Public
router.get('/tipos', async (_req, res) => {
  try {
    res.json(TIPOS_DESCUENTO);
  } catch (error) {
    console.error('Error al obtener tipos de descuento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Obtener todos los descuentos (con filtros opcionales)
// @route   GET /api/descuentos-empleado
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { empleadoId, periodoAplicacion, estado, tipo } = req.query;
    
    const filter: any = {};
    
    if (empleadoId) filter.empleadoId = empleadoId;
    if (periodoAplicacion) filter.periodoAplicacion = periodoAplicacion;
    if (estado) filter.estado = estado;
    if (tipo) filter.tipo = tipo;

    const descuentos = await DescuentoEmpleado.find(filter)
      .populate('empleadoId', 'nombre apellido documento sueldoBase')
      .populate('creadoPor', 'nombre')
      .sort({ fecha: -1 });
    
    // Calcular monto real si es porcentaje
    const descuentosConMonto = descuentos.map(d => {
      const descuento = d.toObject();
      if (descuento.esPorcentaje && descuento.empleadoId) {
        const empleado = descuento.empleadoId as any;
        descuento.montoCalculado = (empleado.sueldoBase * descuento.monto) / 100;
      } else {
        descuento.montoCalculado = descuento.monto;
      }
      return descuento;
    });
    
    res.json(descuentosConMonto);
  } catch (error) {
    console.error('Error al obtener descuentos:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// @desc    Obtener descuentos por empleado
// @route   GET /api/descuentos-empleado/empleado/:empleadoId
// @access  Public
router.get('/empleado/:empleadoId', async (req, res) => {
  try {
    // Obtener el sueldo base del empleado
    const empleado = await Employee.findById(req.params.empleadoId).select('sueldoBase');
    const sueldoBase = empleado?.sueldoBase || 0;

    const descuentos = await DescuentoEmpleado.find({ empleadoId: req.params.empleadoId })
      .populate('creadoPor', 'nombre')
      .sort({ fecha: -1 });
    
    // Calcular monto real si es porcentaje
    const descuentosConMonto = descuentos.map(d => {
      const descuento = d.toObject();
      if (descuento.esPorcentaje) {
        descuento.montoCalculado = (sueldoBase * descuento.monto) / 100;
      } else {
        descuento.montoCalculado = descuento.monto;
      }
      return descuento;
    });
    
    res.json(descuentosConMonto);
  } catch (error) {
    console.error('Error al obtener descuentos del empleado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Obtener descuentos por período
// @route   GET /api/descuentos-empleado/periodo/:periodo
// @access  Public
router.get('/periodo/:periodo', async (req, res) => {
  try {
    const descuentos = await DescuentoEmpleado.find({ 
      periodoAplicacion: req.params.periodo,
      estado: { $ne: 'anulado' }
    })
      .populate('empleadoId', 'nombre apellido documento sueldoBase')
      .sort({ fecha: -1 });
    
    // Calcular monto real si es porcentaje
    const descuentosConMonto = descuentos.map(d => {
      const descuento = d.toObject();
      if (descuento.esPorcentaje && descuento.empleadoId) {
        const empleado = descuento.empleadoId as any;
        descuento.montoCalculado = (empleado.sueldoBase * descuento.monto) / 100;
      } else {
        descuento.montoCalculado = descuento.monto;
      }
      return descuento;
    });
    
    res.json(descuentosConMonto);
  } catch (error) {
    console.error('Error al obtener descuentos del período:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Obtener un descuento por ID
// @route   GET /api/descuentos-empleado/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const descuento = await DescuentoEmpleado.findById(req.params.id)
      .populate('empleadoId', 'nombre apellido documento sueldoBase')
      .populate('creadoPor', 'nombre');
    
    if (!descuento) {
      return res.status(404).json({ message: 'Descuento no encontrado' });
    }
    
    res.json(descuento);
  } catch (error) {
    console.error('Error al obtener descuento:', error);
    if (error instanceof Error && error.name === 'CastError') {
      return res.status(400).json({ message: 'ID de descuento inválido' });
    }
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Crear nuevo descuento
// @route   POST /api/descuentos-empleado
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
      // Ahora requerimos periodoId (referencia a LiquidacionPeriodo abierto)
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

    // Derivar periodoAplicacion desde la fecha de inicio del periodo para mantener compatibilidad
    const derivedPeriodoAplicacion = periodoDoc.fechaInicio instanceof Date
      ? periodoDoc.fechaInicio.toISOString().slice(0,7)
      : new Date(periodoDoc.fechaInicio).toISOString().slice(0,7);

    const descuento = new DescuentoEmpleado({
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
      creadoPor: (req as any).user?.username || (req as any).user?._id // prefer username when available
    });

    const savedDescuento = await descuento.save();
    
    // Poblar datos para la respuesta
    const populatedDescuento = await DescuentoEmpleado.findById(savedDescuento._id)
      .populate('empleadoId', 'nombre apellido documento');

    res.status(201).json(populatedDescuento);
  } catch (error) {
    console.error('Error al crear descuento:', error);
    
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

// @desc    Actualizar descuento
// @route   PUT /api/descuentos-empleado/:id
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const descuento = await DescuentoEmpleado.findById(req.params.id);
    
    if (!descuento) {
      return res.status(404).json({ message: 'Descuento no encontrado' });
    }

    // No permitir editar descuentos ya aplicados
    if (descuento.estado === 'aplicado') {
      return res.status(400).json({ 
        message: 'No se puede editar un descuento ya aplicado' 
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

    if (tipo) descuento.tipo = tipo;
    if (motivo) descuento.motivo = motivo.trim();
    if (monto !== undefined) descuento.monto = Number(monto);
    if (esPorcentaje !== undefined) descuento.esPorcentaje = esPorcentaje;
    if (fecha) descuento.fecha = new Date(fecha);

    if (periodoId) {
      // Validar período destino
      const LiquidacionPeriodo = (await import('../models/LiquidacionPeriodo.js')).default;
      const periodoDoc = await LiquidacionPeriodo.findById(periodoId);
      if (!periodoDoc) return res.status(404).json({ message: 'Período seleccionado no encontrado' });
      if (periodoDoc.estado !== 'abierto') return res.status(400).json({ message: 'El período seleccionado no está abierto' });
      descuento.periodoId = periodoId;
      descuento.periodoAplicacion = periodoDoc.fechaInicio instanceof Date ? periodoDoc.fechaInicio.toISOString().slice(0,7) : new Date(periodoDoc.fechaInicio).toISOString().slice(0,7);
    } else if (periodoAplicacion) {
      if (!/^\d{4}-\d{2}$/.test(periodoAplicacion)) {
        return res.status(400).json({ message: 'El período debe tener formato YYYY-MM' });
      }
      descuento.periodoAplicacion = periodoAplicacion;
    }

    if (estado) descuento.estado = estado;
    if (observaciones !== undefined) descuento.observaciones = observaciones?.trim();

    const updatedDescuento = await descuento.save();
    
    const populatedDescuento = await DescuentoEmpleado.findById(updatedDescuento._id)
      .populate('empleadoId', 'nombre apellido documento');

    res.json(populatedDescuento);
  } catch (error) {
    console.error('Error al actualizar descuento:', error);
    
    if (error instanceof Error && error.name === 'CastError') {
      return res.status(400).json({ message: 'ID de descuento inválido' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Cambiar estado del descuento
// @route   PATCH /api/descuentos-empleado/:id/estado
// @access  Public
router.patch('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    
    if (!estado || !['pendiente', 'aplicado', 'anulado'].includes(estado)) {
      return res.status(400).json({ 
        message: 'Estado inválido. Debe ser: pendiente, aplicado o anulado' 
      });
    }

    const descuento = await DescuentoEmpleado.findById(req.params.id);
    
    if (!descuento) {
      return res.status(404).json({ message: 'Descuento no encontrado' });
    }

    descuento.estado = estado;
    await descuento.save();

    const populatedDescuento = await DescuentoEmpleado.findById(descuento._id)
      .populate('empleadoId', 'nombre apellido documento');

    res.json(populatedDescuento);
  } catch (error) {
    console.error('Error al cambiar estado del descuento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Eliminar descuento
// @route   DELETE /api/descuentos-empleado/:id
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const descuento = await DescuentoEmpleado.findById(req.params.id);
    
    if (!descuento) {
      return res.status(404).json({ message: 'Descuento no encontrado' });
    }

    // No permitir eliminar descuentos ya aplicados
    if (descuento.estado === 'aplicado') {
      return res.status(400).json({ 
        message: 'No se puede eliminar un descuento ya aplicado. Anúlelo en su lugar.' 
      });
    }

    await DescuentoEmpleado.findByIdAndDelete(req.params.id);
    res.json({ 
      message: 'Descuento eliminado exitosamente',
      descuento: {
        tipo: descuento.tipo,
        monto: descuento.monto
      }
    });
  } catch (error) {
    console.error('Error al eliminar descuento:', error);
    
    if (error instanceof Error && error.name === 'CastError') {
      return res.status(400).json({ message: 'ID de descuento inválido' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// @desc    Obtener resumen de descuentos por período
// @route   GET /api/descuentos-empleado/resumen/:periodo
// @access  Public
router.get('/resumen/:periodo', async (req, res) => {
  try {
    const resumen = await DescuentoEmpleado.aggregate([
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
          totalDescuentos: { $sum: '$montoCalculado' },
          cantidadDescuentos: { $sum: 1 },
          descuentos: {
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
          totalDescuentos: 1,
          cantidadDescuentos: 1,
          descuentos: 1
        }
      }
    ]);

    const totalGeneral = resumen.reduce((sum, emp) => sum + emp.totalDescuentos, 0);

    res.json({
      periodo: req.params.periodo,
      totalGeneral,
      empleados: resumen
    });
  } catch (error) {
    console.error('Error al obtener resumen de descuentos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
