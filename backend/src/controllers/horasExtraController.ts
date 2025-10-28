import type { Request, Response } from 'express';
import HoraExtra from '../models/HoraExtra.js';
import Employee from '../models/Employee.js';
import Gasto from '../models/Gasto.js';
import mongoose from 'mongoose';

// Obtener todas las horas extra con filtros opcionales
export const getHorasExtra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { empleadoId, estado, fechaDesde, fechaHasta } = req.query;
    
    // Construir filtros
    const filters: any = {};
    
    if (empleadoId) {
      filters.empleadoId = empleadoId;
    }
    
    if (estado) {
      filters.estado = estado;
    }
    
    if (fechaDesde || fechaHasta) {
      filters.fecha = {};
      if (fechaDesde) {
        filters.fecha.$gte = new Date(fechaDesde as string);
      }
      if (fechaHasta) {
        filters.fecha.$lte = new Date(fechaHasta as string);
      }
    }
    
    const horasExtra = await HoraExtra.find(filters)
      .populate('empleadoId', 'nombre apellido puesto')
      .sort({ fechaCreacion: -1 });
    
    res.json(horasExtra);
  } catch (error) {
    console.error('Error al obtener horas extra:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al obtener horas extra',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener horas extra por empleado
export const getHorasExtraByEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { empleadoId } = req.params;
    
    if (!empleadoId || !mongoose.Types.ObjectId.isValid(empleadoId)) {
      res.status(400).json({ message: 'ID de empleado inválido' });
      return;
    }
    
    const horasExtra = await HoraExtra.find({ empleadoId })
      .sort({ fechaCreacion: -1 });
    
    res.json(horasExtra);
  } catch (error) {
    console.error('Error al obtener horas extra del empleado:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al obtener horas extra del empleado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Crear nueva hora extra
export const createHoraExtra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      empleadoId, 
      empleadoNombre, 
      empleadoApellido, 
      fecha, 
      cantidadHoras, 
      valorHora, 
      descripcion 
    } = req.body;
    
    // Validar que el empleado existe
    if (!mongoose.Types.ObjectId.isValid(empleadoId)) {
      res.status(400).json({ message: 'ID de empleado inválido' });
      return;
    }
    
    const employee = await Employee.findById(empleadoId);
    if (!employee) {
      res.status(404).json({ message: 'Empleado no encontrado' });
      return;
    }
    
    // Validar datos requeridos
    if (!fecha || !cantidadHoras || !valorHora) {
      res.status(400).json({ message: 'Fecha, cantidad de horas y valor por hora son requeridos' });
      return;
    }
    
    if (cantidadHoras <= 0) {
      res.status(400).json({ message: 'La cantidad de horas debe ser mayor a 0' });
      return;
    }
    
    if (valorHora < 0) {
      res.status(400).json({ message: 'El valor por hora no puede ser negativo' });
      return;
    }
    
    const nuevaHoraExtra = new HoraExtra({
      empleadoId,
      empleadoNombre: empleadoNombre || employee.nombre,
      empleadoApellido: empleadoApellido || employee.apellido,
      fecha: new Date(fecha),
      cantidadHoras: parseFloat(cantidadHoras),
      valorHora: parseFloat(valorHora),
      descripcion: descripcion || '',
      estado: 'registrada'
    });
    
    const horaExtraGuardada = await nuevaHoraExtra.save();
    res.status(201).json(horaExtraGuardada);
  } catch (error) {
    console.error('Error al crear hora extra:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      res.status(400).json({ 
        message: 'Datos inválidos',
        errors: validationErrors
      });
      return;
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor al crear hora extra',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Actualizar hora extra
export const updateHoraExtra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }
    
    const horaExtra = await HoraExtra.findById(id);
    if (!horaExtra) {
      res.status(404).json({ message: 'Hora extra no encontrada' });
      return;
    }
    
    // No permitir actualizar si ya está pagada
    if (horaExtra.estado === 'pagada') {
      res.status(400).json({ message: 'No se puede modificar una hora extra ya pagada' });
      return;
    }
    
    // Validar datos si se están actualizando
    if (updateData.cantidadHoras !== undefined && updateData.cantidadHoras <= 0) {
      res.status(400).json({ message: 'La cantidad de horas debe ser mayor a 0' });
      return;
    }
    
    if (updateData.valorHora !== undefined && updateData.valorHora < 0) {
      res.status(400).json({ message: 'El valor por hora no puede ser negativo' });
      return;
    }
    
    const horaExtraActualizada = await HoraExtra.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json(horaExtraActualizada);
  } catch (error) {
    console.error('Error al actualizar hora extra:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      res.status(400).json({ 
        message: 'Datos inválidos',
        errors: validationErrors
      });
      return;
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor al actualizar hora extra',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Marcar hora extra como pagada
export const marcarComoPagada = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { medioDePago, banco, comentario } = req.body;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }
    
    const horaExtra = await HoraExtra.findById(id);
    if (!horaExtra) {
      res.status(404).json({ message: 'Hora extra no encontrada' });
      return;
    }
    
    if (horaExtra.estado !== 'registrada') {
      res.status(400).json({ message: 'Solo se pueden marcar como pagadas las horas extra registradas' });
      return;
    }

    // Crear automáticamente un gasto de SUELDOS para registrar el pago
    const nuevoGasto = new Gasto({
      fecha: new Date().toISOString().split('T')[0],
      rubro: 'SUELDOS',
      subRubro: `${horaExtra.empleadoApellido}, ${horaExtra.empleadoNombre}`,
      medioDePago: medioDePago || 'Efectivo',
      clientes: '',
      detalleGastos: `Pago horas extra - ${horaExtra.cantidadHoras} horas (${horaExtra.descripcion || 'Sin descripción'})`,
      tipoOperacion: 'salida',
      concepto: 'hora_extra',
      comentario: comentario || `Pago automático de ${horaExtra.cantidadHoras} horas extra`,
      salida: horaExtra.montoTotal,
      entrada: 0,
      banco: banco || 'EFECTIVO',
      estado: 'activo',
      confirmado: true
    });

    const gastoGuardado = await nuevoGasto.save();
    
    // Actualizar la hora extra con el ID del gasto relacionado
    horaExtra.estado = 'pagada';
    horaExtra.fechaPago = new Date();
    horaExtra.gastoRelacionadoId = gastoGuardado._id;
    
    const horaExtraActualizada = await horaExtra.save();
    
    res.json({
      horaExtra: horaExtraActualizada,
      gastoCreado: gastoGuardado
    });
  } catch (error) {
    console.error('Error al marcar hora extra como pagada:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al marcar como pagada',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Cancelar hora extra
export const cancelarHoraExtra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }
    
    const horaExtra = await HoraExtra.findById(id);
    if (!horaExtra) {
      res.status(404).json({ message: 'Hora extra no encontrada' });
      return;
    }
    
    if (horaExtra.estado === 'pagada') {
      res.status(400).json({ message: 'No se puede cancelar una hora extra ya pagada' });
      return;
    }
    
    horaExtra.estado = 'cancelada';
    const horaExtraActualizada = await horaExtra.save();
    
    res.json(horaExtraActualizada);
  } catch (error) {
    console.error('Error al cancelar hora extra:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al cancelar hora extra',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Eliminar hora extra (solo admin)
export const deleteHoraExtra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }
    
    const horaExtra = await HoraExtra.findById(id);
    if (!horaExtra) {
      res.status(404).json({ message: 'Hora extra no encontrada' });
      return;
    }
    
    // No permitir eliminar si ya está pagada
    if (horaExtra.estado === 'pagada') {
      res.status(400).json({ message: 'No se puede eliminar una hora extra ya pagada' });
      return;
    }
    
    await HoraExtra.findByIdAndDelete(id);
    res.json({ message: 'Hora extra eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar hora extra:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al eliminar hora extra',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener resumen de horas extra por empleado
export const getResumenHorasExtra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { empleadoId, mes } = req.query;
    
    const matchStage: any = {};
    
    if (empleadoId) {
      matchStage.empleadoId = new mongoose.Types.ObjectId(empleadoId as string);
    }
    
    if (mes) {
      const [year, month] = (mes as string).split('-');
      if (year && month) {
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        matchStage.fecha = { $gte: startDate, $lte: endDate };
      }
    }
    
    const resumen = await HoraExtra.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            empleadoId: '$empleadoId',
            empleadoNombre: '$empleadoNombre',
            empleadoApellido: '$empleadoApellido'
          },
          totalHoras: { $sum: '$cantidadHoras' },
          totalMonto: { $sum: '$montoTotal' },
          horasRegistradas: {
            $sum: { $cond: [{ $eq: ['$estado', 'registrada'] }, '$cantidadHoras', 0] }
          },
          montoRegistrado: {
            $sum: { $cond: [{ $eq: ['$estado', 'registrada'] }, '$montoTotal', 0] }
          },
          horasPagadas: {
            $sum: { $cond: [{ $eq: ['$estado', 'pagada'] }, '$cantidadHoras', 0] }
          },
          montoPagado: {
            $sum: { $cond: [{ $eq: ['$estado', 'pagada'] }, '$montoTotal', 0] }
          },
          registros: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          empleadoId: '$_id.empleadoId',
          empleadoNombre: '$_id.empleadoNombre',
          empleadoApellido: '$_id.empleadoApellido',
          totalHoras: 1,
          totalMonto: 1,
          horasRegistradas: 1,
          montoRegistrado: 1,
          horasPagadas: 1,
          montoPagado: 1,
          registros: 1
        }
      },
      { $sort: { empleadoApellido: 1, empleadoNombre: 1 } }
    ]);
    
    res.json(resumen);
  } catch (error) {
    console.error('Error al obtener resumen de horas extra:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al obtener resumen',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};