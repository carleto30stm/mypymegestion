import type { Request, Response } from 'express';
import OrdenProduccion from '../models/OrdenProduccion.js';
import Receta from '../models/Receta.js';
import MateriaPrima from '../models/MateriaPrima.js';
import Producto from '../models/Producto.js';
import MovimientoInventario from '../models/MovimientoInventario.js';
import mongoose from 'mongoose';

// Obtener todas las órdenes con filtros
export const getOrdenes = async (req: Request, res: Response) => {
  try {
    const { estado, productoId, fechaDesde, fechaHasta, prioridad } = req.query;
    
    const filtro: any = {};
    if (estado) filtro.estado = estado;
    if (productoId) filtro.productoId = productoId;
    if (prioridad) filtro.prioridad = prioridad;
    if (fechaDesde || fechaHasta) {
      filtro.fecha = {};
      if (fechaDesde) filtro.fecha.$gte = new Date(fechaDesde as string);
      if (fechaHasta) filtro.fecha.$lte = new Date(fechaHasta as string);
    }

    const ordenes = await OrdenProduccion.find(filtro)
      .populate('productoId', 'codigo nombre precioVenta')
      .populate('recetaId', 'version rendimiento')
      .sort({ fecha: -1, prioridad: 1 });

    res.json(ordenes);
  } catch (error: any) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ 
      mensaje: 'Error al obtener órdenes de producción', 
      error: error.message 
    });
  }
};

// Obtener orden por ID
export const getOrdenById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const orden = await OrdenProduccion.findById(id)
      .populate('productoId', 'codigo nombre precioVenta')
      .populate('recetaId');

    if (!orden) {
      return res.status(404).json({ mensaje: 'Orden de producción no encontrada' });
    }

    res.json(orden);
  } catch (error: any) {
    console.error('Error al obtener orden:', error);
    res.status(500).json({ 
      mensaje: 'Error al obtener orden de producción', 
      error: error.message 
    });
  }
};

// Crear nueva orden de producción
export const crearOrden = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      recetaId,
      cantidadAProducir,
      fecha,
      prioridad,
      responsable,
      observaciones,
      createdBy
    } = req.body;

    // Obtener receta
    const receta = await Receta.findById(recetaId).session(session);
    if (!receta) {
      await session.abortTransaction();
      return res.status(404).json({ mensaje: 'Receta no encontrada' });
    }

    if (receta.estado !== 'activa') {
      await session.abortTransaction();
      return res.status(400).json({ mensaje: 'La receta debe estar activa para crear una orden' });
    }

    // Obtener producto
    const producto = await Producto.findById(receta.productoId).session(session);
    if (!producto) {
      await session.abortTransaction();
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    // Calcular materias primas necesarias y verificar disponibilidad
    const materiasPrimasOrden = [];
    for (const item of receta.materiasPrimas) {
      const mp = await MateriaPrima.findById(item.materiaPrimaId).session(session);
      const cantidadNecesaria = item.cantidad * cantidadAProducir;
      
      if (!mp) {
        await session.abortTransaction();
        return res.status(404).json({ mensaje: `Materia prima no encontrada: ${item.nombreMateriaPrima}` });
      }

      if (mp.stock < cantidadNecesaria) {
        await session.abortTransaction();
        return res.status(400).json({ 
          mensaje: 'Error al crear orden de producción',
          error: `Stock insuficiente de ${mp.nombre}. Necesario: ${cantidadNecesaria}, Disponible: ${mp.stock}`
        });
      }

      materiasPrimasOrden.push({
        materiaPrimaId: mp._id,
        codigoMateriaPrima: mp.codigo,
        nombreMateriaPrima: mp.nombre,
        cantidadNecesaria,
        cantidadReservada: 0,
        cantidadConsumida: 0,
        costo: mp.precioPromedio || mp.precioUltimaCompra || 0
      });
    }

    // Calcular unidades a producir
    const unidadesAProducir = cantidadAProducir * receta.rendimiento;

    // Crear orden
    const nuevaOrden = new OrdenProduccion({
      fecha: fecha || new Date(),
      recetaId: receta._id,
      productoId: producto._id,
      codigoProducto: producto.codigo,
      nombreProducto: producto.nombre,
      cantidadAProducir,
      unidadesProducidas: 0,
      materiasPrimas: materiasPrimasOrden,
      costoManoObra: (receta.costoManoObra || 0) * cantidadAProducir,
      costoIndirecto: (receta.costoIndirecto || 0) * cantidadAProducir,
      estado: 'planificada',
      prioridad: prioridad || 'media',
      responsable,
      observaciones,
      createdBy
    });

    await nuevaOrden.save({ session });
    
    // Populate antes de hacer commit
    const ordenPopulada = await OrdenProduccion.findById(nuevaOrden._id)
      .session(session)
      .populate('productoId', 'codigo nombre precioVenta')
      .populate('recetaId', 'version rendimiento');

    await session.commitTransaction();

    res.status(201).json(ordenPopulada);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al crear orden:', error);
    res.status(500).json({ 
      mensaje: 'Error al crear orden de producción', 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// Iniciar producción (reservar materias primas)
export const iniciarProduccion = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const orden = await OrdenProduccion.findById(id).session(session);
    if (!orden) {
      await session.abortTransaction();
      return res.status(404).json({ mensaje: 'Orden de producción no encontrada' });
    }

    if (orden.estado !== 'planificada') {
      await session.abortTransaction();
      return res.status(400).json({ 
        mensaje: `No se puede iniciar una orden en estado: ${orden.estado}` 
      });
    }

    // Reservar materias primas (actualizar cantidadReservada)
    for (const item of orden.materiasPrimas) {
      const mp = await MateriaPrima.findById(item.materiaPrimaId).session(session);
      
      if (!mp) {
        throw new Error(`Materia prima no encontrada: ${item.nombreMateriaPrima}`);
      }

      // Verificar stock disponible
      if (mp.stock < item.cantidadNecesaria) {
        throw new Error(
          `Stock insuficiente de ${mp.nombre}. ` +
          `Necesario: ${item.cantidadNecesaria}, Disponible: ${mp.stock}`
        );
      }

      // Actualizar cantidad reservada en la orden
      item.cantidadReservada = item.cantidadNecesaria;
    }

    orden.estado = 'en_proceso';
    orden.fechaInicio = new Date();
    await orden.save({ session });

    await session.commitTransaction();

    const ordenActualizada = await OrdenProduccion.findById(id)
      .populate('productoId', 'codigo nombre precioVenta')
      .populate('recetaId', 'version rendimiento');

    res.json(ordenActualizada);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al iniciar producción:', error);
    res.status(500).json({ 
      mensaje: 'Error al iniciar producción', 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// Completar producción (consumir materias primas y generar productos)
export const completarProduccion = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { unidadesProducidas, completadoPor } = req.body;

    if (!unidadesProducidas || unidadesProducidas <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ mensaje: 'Las unidades producidas deben ser un número positivo' });
    }

    if (!completadoPor) {
      await session.abortTransaction();
      return res.status(400).json({ mensaje: 'El usuario que completa la orden es requerido' });
    }

    const orden = await OrdenProduccion.findById(id).session(session);
    if (!orden) {
      await session.abortTransaction();
      return res.status(404).json({ mensaje: 'Orden de producción no encontrada' });
    }

    if (orden.estado !== 'en_proceso') {
      await session.abortTransaction();
      return res.status(400).json({ 
        mensaje: `No se puede completar una orden en estado: ${orden.estado}` 
      });
    }

    // Consumir materias primas y registrar movimientos
    for (const item of orden.materiasPrimas) {
      const mp = await MateriaPrima.findById(item.materiaPrimaId).session(session);
      
      if (!mp) {
        throw new Error(`Materia prima no encontrada: ${item.nombreMateriaPrima}`);
      }

      // Verificar stock suficiente
      if (mp.stock < item.cantidadNecesaria) {
        throw new Error(
          `Stock insuficiente de ${mp.nombre}. ` +
          `Necesario: ${item.cantidadNecesaria}, Disponible: ${mp.stock}`
        );
      }

      const stockAnterior = mp.stock;
      mp.stock -= item.cantidadNecesaria;
      await mp.save({ session });

      // Registrar movimiento de salida
      await MovimientoInventario.create([{
        fecha: new Date(),
        tipo: 'produccion',
        materiaPrimaId: mp._id,
        codigoMateriaPrima: mp.codigo,
        nombreMateriaPrima: mp.nombre,
        cantidad: item.cantidadNecesaria,
        unidadMedida: mp.unidadMedida,
        stockAnterior,
        stockNuevo: mp.stock,
        precioUnitario: item.costo,
        valor: item.costo * item.cantidadNecesaria,
        documentoOrigen: 'produccion',
        documentoOrigenId: orden._id,
        numeroDocumento: orden.numeroOrden,
        observaciones: `Producción: ${orden.nombreProducto}`,
        responsable: orden.responsable,
        usuario: completadoPor
      }], { session });

      // Actualizar cantidad consumida
      item.cantidadConsumida = item.cantidadNecesaria;
    }

    // Actualizar el producto (incrementar stock)
    const producto = await Producto.findById(orden.productoId).session(session);
    if (!producto) {
      throw new Error(`Producto no encontrado: ${orden.nombreProducto}`);
    }

    const stockAnteriorProducto = producto.stock || 0;
    producto.stock = stockAnteriorProducto + unidadesProducidas;
    await producto.save({ session });

    console.log(`✅ Stock producto actualizado: ${orden.nombreProducto} | Anterior: ${stockAnteriorProducto} | Producidas: ${unidadesProducidas} | Nuevo: ${producto.stock}`);

    orden.estado = 'completada';
    orden.fechaFinalizacion = new Date();
    orden.unidadesProducidas = unidadesProducidas;
    await orden.save({ session });

    await session.commitTransaction();

    const ordenCompletada = await OrdenProduccion.findById(id)
      .populate('productoId', 'codigo nombre precioVenta stock')
      .populate('recetaId', 'version rendimiento');

    res.json(ordenCompletada);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al completar producción:', error);
    res.status(500).json({ 
      mensaje: 'Error al completar producción', 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// Cancelar orden
export const cancelarOrden = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { motivoCancelacion } = req.body;

    if (!motivoCancelacion) {
      await session.abortTransaction();
      return res.status(400).json({ mensaje: 'El motivo de cancelación es obligatorio' });
    }

    const orden = await OrdenProduccion.findById(id).session(session);
    if (!orden) {
      await session.abortTransaction();
      return res.status(404).json({ mensaje: 'Orden de producción no encontrada' });
    }

    if (orden.estado === 'completada') {
      await session.abortTransaction();
      return res.status(400).json({ mensaje: 'No se puede cancelar una orden completada' });
    }

    if (orden.estado === 'cancelada') {
      await session.abortTransaction();
      return res.status(400).json({ mensaje: 'La orden ya está cancelada' });
    }

    // Si la orden estaba en proceso, liberar reservas (no se hace nada físicamente, solo cambio de estado)
    orden.estado = 'cancelada';
    orden.motivoCancelacion = motivoCancelacion;
    await orden.save({ session });

    await session.commitTransaction();

    const ordenCancelada = await OrdenProduccion.findById(id)
      .populate('productoId', 'codigo nombre precioVenta')
      .populate('recetaId', 'version rendimiento');

    res.json(ordenCancelada);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al cancelar orden:', error);
    res.status(500).json({ 
      mensaje: 'Error al cancelar orden', 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// Obtener estadísticas de producción
export const obtenerEstadisticas = async (req: Request, res: Response) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    const filtroFecha: any = {};
    if (fechaDesde || fechaHasta) {
      filtroFecha.fecha = {};
      if (fechaDesde) filtroFecha.fecha.$gte = new Date(fechaDesde as string);
      if (fechaHasta) filtroFecha.fecha.$lte = new Date(fechaHasta as string);
    }

    const totalOrdenes = await OrdenProduccion.countDocuments(filtroFecha);
    
    const ordenesPorEstado = await OrdenProduccion.aggregate([
      { $match: filtroFecha },
      {
        $group: {
          _id: '$estado',
          cantidad: { $sum: 1 },
          unidadesProducidas: { $sum: '$unidadesProducidas' },
          costoTotal: { $sum: '$costoTotal' }
        }
      }
    ]);

    const productosMasProducidos = await OrdenProduccion.aggregate([
      { $match: { ...filtroFecha, estado: 'completada' } },
      {
        $group: {
          _id: '$productoId',
          codigoProducto: { $first: '$codigoProducto' },
          nombreProducto: { $first: '$nombreProducto' },
          totalOrdenes: { $sum: 1 },
          unidadesProducidas: { $sum: '$unidadesProducidas' },
          costoTotal: { $sum: '$costoTotal' }
        }
      },
      { $sort: { unidadesProducidas: -1 } },
      { $limit: 10 }
    ]);

    const costoTotalProduccion = await OrdenProduccion.aggregate([
      { $match: { ...filtroFecha, estado: 'completada' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$costoTotal' }
        }
      }
    ]);

    res.json({
      totalOrdenes,
      ordenesPorEstado,
      productosMasProducidos,
      costoTotalProduccion: costoTotalProduccion[0]?.total || 0
    });
  } catch (error: any) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      mensaje: 'Error al obtener estadísticas de producción', 
      error: error.message 
    });
  }
};
