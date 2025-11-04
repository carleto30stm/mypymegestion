import type { Request, Response } from 'express';
import MovimientoInventario from '../models/MovimientoInventario.js';
import MateriaPrima from '../models/MateriaPrima.js';
import mongoose from 'mongoose';

// Obtener todos los movimientos
export const getMovimientos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      materiaPrimaId, 
      tipo, 
      fechaDesde, 
      fechaHasta,
      limit = 100 
    } = req.query;
    
    // Construir filtros
    const filtros: any = {};
    if (materiaPrimaId) filtros.materiaPrimaId = materiaPrimaId;
    if (tipo) filtros.tipo = tipo;
    
    if (fechaDesde || fechaHasta) {
      filtros.fecha = {};
      if (fechaDesde) filtros.fecha.$gte = new Date(fechaDesde as string);
      if (fechaHasta) filtros.fecha.$lte = new Date(fechaHasta as string);
    }
    
    const movimientos = await MovimientoInventario.find(filtros)
      .populate('materiaPrimaId', 'nombre codigo categoria')
      .sort({ fecha: -1 })
      .limit(parseInt(limit as string));
    
    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({ 
      message: 'Error al obtener movimientos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener movimientos por materia prima
export const getMovimientosByMateriaPrima = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    const movimientos = await MovimientoInventario.find({ materiaPrimaId: id })
      .sort({ fecha: -1 })
      .limit(parseInt(limit as string));
    
    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({ 
      message: 'Error al obtener movimientos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Crear ajuste manual de inventario
export const crearAjuste = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      materiaPrimaId, 
      cantidad, 
      tipo, // 'entrada' | 'salida' | 'ajuste'
      motivo, 
      observaciones,
      usuario 
    } = req.body;
    
    const materiaPrima = await MateriaPrima.findById(materiaPrimaId).session(session);
    if (!materiaPrima) {
      await session.abortTransaction();
      res.status(404).json({ message: 'Materia prima no encontrada' });
      return;
    }
    
    const stockAnterior = materiaPrima.stock;
    let stockNuevo = stockAnterior;
    let cantidadMovimiento = cantidad;
    
    if (tipo === 'entrada' || tipo === 'ajuste') {
      stockNuevo = stockAnterior + Math.abs(cantidad);
      cantidadMovimiento = Math.abs(cantidad);
    } else if (tipo === 'salida') {
      if (stockAnterior < Math.abs(cantidad)) {
        await session.abortTransaction();
        res.status(400).json({ 
          message: 'Stock insuficiente',
          stockActual: stockAnterior,
          cantidadSolicitada: Math.abs(cantidad)
        });
        return;
      }
      stockNuevo = stockAnterior - Math.abs(cantidad);
      cantidadMovimiento = -Math.abs(cantidad);
    }
    
    // Actualizar stock
    materiaPrima.stock = stockNuevo;
    await materiaPrima.save({ session });
    
    // Registrar movimiento
    const movimiento = new MovimientoInventario({
      fecha: new Date(),
      tipo: tipo,
      materiaPrimaId: materiaPrima._id,
      codigoMateriaPrima: materiaPrima.codigo,
      nombreMateriaPrima: materiaPrima.nombre,
      cantidad: cantidadMovimiento,
      precioUnitario: materiaPrima.precioPromedio,
      stockAnterior: stockAnterior,
      stockNuevo: stockNuevo,
      unidadMedida: materiaPrima.unidadMedida,
      documentoOrigen: 'ajuste_manual',
      motivo: motivo,
      observaciones: observaciones,
      usuario: usuario
    });
    
    await movimiento.save({ session });
    
    await session.commitTransaction();
    res.json({ 
      message: 'Ajuste registrado exitosamente',
      movimiento,
      materiaPrima
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error al crear ajuste:', error);
    res.status(500).json({ 
      message: 'Error al crear ajuste',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  } finally {
    session.endSession();
  }
};

// Obtener estadísticas de movimientos
export const getEstadisticasMovimientos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    const filtros: any = {};
    if (fechaDesde || fechaHasta) {
      filtros.fecha = {};
      if (fechaDesde) filtros.fecha.$gte = new Date(fechaDesde as string);
      if (fechaHasta) filtros.fecha.$lte = new Date(fechaHasta as string);
    }
    
    const estadisticas = await MovimientoInventario.aggregate([
      { $match: filtros },
      {
        $group: {
          _id: '$tipo',
          cantidad: { $sum: 1 },
          totalCantidad: { $sum: '$cantidad' },
          totalValor: { $sum: '$valor' }
        }
      }
    ]);
    
    const totalMovimientos = await MovimientoInventario.countDocuments(filtros);
    
    res.json({
      totalMovimientos,
      porTipo: estadisticas
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener kardex (historial completo) de una materia prima
export const getKardex = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fechaDesde, fechaHasta } = req.query;
    
    const materiaPrima = await MateriaPrima.findById(id);
    if (!materiaPrima) {
      res.status(404).json({ message: 'Materia prima no encontrada' });
      return;
    }
    
    const filtros: any = { materiaPrimaId: id };
    if (fechaDesde || fechaHasta) {
      filtros.fecha = {};
      if (fechaDesde) filtros.fecha.$gte = new Date(fechaDesde as string);
      if (fechaHasta) filtros.fecha.$lte = new Date(fechaHasta as string);
    }
    
    const movimientos = await MovimientoInventario.find(filtros)
      .sort({ fecha: 1 }); // Orden cronológico para kardex
    
    res.json({
      materiaPrima: {
        codigo: materiaPrima.codigo,
        nombre: materiaPrima.nombre,
        stockActual: materiaPrima.stock,
        unidadMedida: materiaPrima.unidadMedida
      },
      movimientos
    });
  } catch (error) {
    console.error('Error al obtener kardex:', error);
    res.status(500).json({ 
      message: 'Error al obtener kardex',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
