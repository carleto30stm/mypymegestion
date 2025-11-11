import type { Request, Response } from 'express';
import Compra from '../models/Compra.js';
import MateriaPrima from '../models/MateriaPrima.js';
import Proveedor from '../models/Proveedor.js';
import Gasto from '../models/Gasto.js';
import MovimientoInventario from '../models/MovimientoInventario.js';
import mongoose from 'mongoose';

// Obtener todas las compras
export const getCompras = async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado, proveedorId, fechaDesde, fechaHasta } = req.query;
    
    // Construir filtros
    const filtros: any = {};
    if (estado) filtros.estado = estado;
    if (proveedorId) filtros.proveedorId = proveedorId;
    
    if (fechaDesde || fechaHasta) {
      filtros.fecha = {};
      if (fechaDesde) filtros.fecha.$gte = new Date(fechaDesde as string);
      if (fechaHasta) filtros.fecha.$lte = new Date(fechaHasta as string);
    }
    
    const compras = await Compra.find(filtros)
      .populate('proveedorId', 'razonSocial numeroDocumento')
      .sort({ fecha: -1 });
    
    res.json(compras);
  } catch (error) {
    console.error('Error al obtener compras:', error);
    res.status(500).json({ 
      message: 'Error al obtener compras',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener una compra por ID
export const getCompraById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const compra = await Compra.findById(id)
      .populate('proveedorId')
      .populate('items.materiaPrimaId')
      .populate('gastoRelacionadoId');
    
    if (!compra) {
      res.status(404).json({ message: 'Compra no encontrada' });
      return;
    }
    
    res.json(compra);
  } catch (error) {
    console.error('Error al obtener compra:', error);
    res.status(500).json({ 
      message: 'Error al obtener compra',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Crear una compra (presupuesto inicial)
export const createCompra = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Agregar el usuario que crea la compra desde la sesión
    const datosCompra = {
      ...req.body,
      creadoPor: req.user?.username // Obtener ID del usuario autenticado
    };
    
    const nuevaCompra = new Compra(datosCompra);
    const compraGuardada = await nuevaCompra.save({ session });
    
    await session.commitTransaction();
    res.status(201).json(compraGuardada);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al crear compra:', error);
    
    // Error de validación
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ 
        message: 'Error de validación',
        errores 
      });
      return;
    }
    
    res.status(500).json({ 
      message: 'Error al crear compra',
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// Actualizar una compra
export const updateCompra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const compraActualizada = await Compra.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!compraActualizada) {
      res.status(404).json({ message: 'Compra no encontrada' });
      return;
    }
    
    res.json(compraActualizada);
  } catch (error: any) {
    console.error('Error al actualizar compra:', error);
    
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ 
        message: 'Error de validación',
        errores 
      });
      return;
    }
    
    res.status(500).json({ 
      message: 'Error al actualizar compra',
      error: error.message 
    });
  }
};

// Confirmar recepción de compra (actualiza stock de materias primas)
export const confirmarRecepcion = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { fechaRecepcion } = req.body;
    
    const compra = await Compra.findById(id).session(session);
    if (!compra) {
      await session.abortTransaction();
      res.status(404).json({ message: 'Compra no encontrada' });
      return;
    }
    
    if (compra.estado !== 'pedido' && compra.estado !== 'presupuesto') {
      await session.abortTransaction();
      res.status(400).json({ 
        message: `No se puede confirmar recepción de una compra en estado: ${compra.estado}` 
      });
      return;
    }
    
    // Actualizar stock de cada materia prima y registrar movimiento
    for (const item of compra.items) {
      const materiaPrima = await MateriaPrima.findById(item.materiaPrimaId).session(session);
      
      if (!materiaPrima) {
        throw new Error(`Materia prima ${item.nombreMateriaPrima} no encontrada`);
      }
      
      // Calcular nuevo precio promedio ponderado
      const stockAnterior = materiaPrima.stock;
      const valorAnterior = materiaPrima.precioPromedio * stockAnterior;
      const valorNuevo = item.precioUnitario * item.cantidad;
      const stockNuevo = stockAnterior + item.cantidad;
      
      materiaPrima.stock = stockNuevo;
      materiaPrima.precioPromedio = (valorAnterior + valorNuevo) / stockNuevo;
      materiaPrima.precioUltimaCompra = item.precioUnitario;
      materiaPrima.ultimaCompra = fechaRecepcion || new Date();
      
      await materiaPrima.save({ session });
      
      // Registrar movimiento de inventario
      const movimiento = new MovimientoInventario({
        fecha: fechaRecepcion || new Date(),
        tipo: 'entrada',
        materiaPrimaId: item.materiaPrimaId,
        codigoMateriaPrima: item.codigoMateriaPrima,
        nombreMateriaPrima: item.nombreMateriaPrima,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        stockAnterior: stockAnterior,
        stockNuevo: stockNuevo,
        unidadMedida: materiaPrima.unidadMedida,
        documentoOrigen: 'compra',
        documentoOrigenId: compra._id,
        numeroDocumento: compra.numeroCompra,
        motivo: `Compra ${compra.numeroCompra} - ${compra.razonSocialProveedor}`,
        usuario: compra.comprador
      });
      
      await movimiento.save({ session });
    }
    
    // Actualizar estado de la compra
    compra.estado = 'recibido';
    compra.fechaRecepcion = fechaRecepcion || new Date();
    await compra.save({ session });
    
    // Actualizar última compra del proveedor
    await Proveedor.findByIdAndUpdate(
      compra.proveedorId,
      { ultimaCompra: fechaRecepcion || new Date() },
      { session }
    );
    
    await session.commitTransaction();
    res.json({ 
      message: 'Recepción confirmada y stock actualizado',
      compra 
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error al confirmar recepción:', error);
    res.status(500).json({ 
      message: 'Error al confirmar recepción',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  } finally {
    session.endSession();
  }
};

// Confirmar pago de compra (crea gasto y actualiza saldo proveedor)
export const confirmarPago = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { medioPago, banco, detallesPago, montoPagado } = req.body;
    
    if (!medioPago) {
      await session.abortTransaction();
      res.status(400).json({ message: 'El medio de pago es requerido' });
      return;
    }
    
    // Validar que banco sea requerido para medios de pago que lo necesitan
    const requiereBanco = medioPago !== 'CHEQUE TERCERO' && medioPago !== 'EFECTIVO';
    if (requiereBanco && !banco) {
      await session.abortTransaction();
      res.status(400).json({ 
        message: 'Debe seleccionar una caja/banco para este medio de pago' 
      });
      return;
    }
    
    const compra = await Compra.findById(id).session(session);
    if (!compra) {
      await session.abortTransaction();
      res.status(404).json({ message: 'Compra no encontrada' });
      return;
    }
    
    if (compra.estado !== 'recibido' && compra.estado !== 'parcial') {
      await session.abortTransaction();
      res.status(400).json({ 
        message: `No se puede confirmar pago de una compra en estado: ${compra.estado}` 
      });
      return;
    }
    
    const monto = montoPagado || compra.total;
    
    // Determinar si el pago es con cheque (debe quedar pendiente)
    const esCheque = medioPago.toUpperCase().includes('CHEQUE');
    
    // Crear gasto asociado
    const nuevoGasto = new Gasto({
      fecha: new Date(),
      rubro: 'PROOV.MATERIA.PRIMA',
      subRubro: 'COMPRA DE MATERIAS PRIMAS',
      medioDePago: medioPago,
      banco: banco || (medioPago === 'EFECTIVO' ? 'EFECTIVO' : undefined),
      detalleGastos: `Pago compra ${compra.numeroCompra} - ${compra.razonSocialProveedor}`,
      tipoOperacion: 'salida',
      salida: monto,
      entrada: 0,
      estado: 'activo',
      confirmado: !esCheque, // Si es cheque, queda pendiente (confirmado = false)
      comentario: detallesPago || `Compra ${compra.numeroCompra} - Items: ${compra.items.map(i => i.nombreMateriaPrima).join(', ')}`
    });
    
    const gastoGuardado = await nuevoGasto.save({ session });
    
    // Actualizar compra
    compra.medioPago = medioPago;
    compra.banco = banco;
    compra.detallesPago = detallesPago;
    compra.gastoRelacionadoId = gastoGuardado._id as mongoose.Types.ObjectId;
    
    // Si el pago es parcial o completo
    if (montoPagado && montoPagado < compra.total) {
      compra.estado = 'parcial';
    } else {
      compra.estado = 'pagado';
    }
    
    await compra.save({ session });
    
    // Actualizar saldo del proveedor
    const proveedor = await Proveedor.findById(compra.proveedorId).session(session);
    if (proveedor) {
      // Si pagamos, reducimos el saldo (lo que debemos)
      proveedor.saldoCuenta -= monto;
      await proveedor.save({ session });
    }
    
    await session.commitTransaction();
    res.json({ 
      message: 'Pago confirmado exitosamente',
      compra,
      gasto: gastoGuardado
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error al confirmar pago:', error);
    res.status(500).json({ 
      message: 'Error al confirmar pago',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  } finally {
    session.endSession();
  }
};

// Anular compra
export const anularCompra = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    
    const compra = await Compra.findById(id).session(session);
    if (!compra) {
      await session.abortTransaction();
      res.status(404).json({ message: 'Compra no encontrada' });
      return;
    }
    
    if (compra.estado === 'anulado') {
      await session.abortTransaction();
      res.status(400).json({ message: 'La compra ya está anulada' });
      return;
    }
    
    // Si la compra fue recibida, revertir stock
    if (compra.estado === 'recibido' || compra.estado === 'pagado' || compra.estado === 'parcial') {
      for (const item of compra.items) {
        const materiaPrima = await MateriaPrima.findById(item.materiaPrimaId).session(session);
        
        if (materiaPrima) {
          if (materiaPrima.stock < item.cantidad) {
            throw new Error(
              `No hay suficiente stock de ${item.nombreMateriaPrima} para revertir (Stock: ${materiaPrima.stock}, Necesario: ${item.cantidad})`
            );
          }
          
          materiaPrima.stock -= item.cantidad;
          await materiaPrima.save({ session });
        }
      }
    }
    
    // Si existe gasto relacionado, anularlo
    if (compra.gastoRelacionadoId) {
      await Gasto.findByIdAndUpdate(
        compra.gastoRelacionadoId,
        { 
          estado: 'cancelado',
          comentario: `Anulado por cancelación de compra ${compra.numeroCompra}: ${motivo}`
        },
        { session }
      );
      
      // Revertir saldo del proveedor
      const proveedor = await Proveedor.findById(compra.proveedorId).session(session);
      if (proveedor) {
        proveedor.saldoCuenta += compra.total;
        await proveedor.save({ session });
      }
    }
    
    // Anular compra
    compra.estado = 'anulado';
    compra.fechaAnulacion = new Date();
    compra.motivoAnulacion = motivo;
    await compra.save({ session });
    
    await session.commitTransaction();
    res.json({ 
      message: 'Compra anulada exitosamente',
      compra 
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error al anular compra:', error);
    res.status(500).json({ 
      message: 'Error al anular compra',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  } finally {
    session.endSession();
  }
};

// Cambiar estado de compra (simple)
export const cambiarEstadoCompra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    if (!estado) {
      res.status(400).json({ message: 'El estado es requerido' });
      return;
    }
    
    const estadosValidos = ['presupuesto', 'pedido', 'parcial', 'recibido', 'pagado', 'anulado'];
    if (!estadosValidos.includes(estado)) {
      res.status(400).json({ 
        message: `Estado inválido. Estados válidos: ${estadosValidos.join(', ')}` 
      });
      return;
    }
    
    const compra = await Compra.findById(id);
    if (!compra) {
      res.status(404).json({ message: 'Compra no encontrada' });
      return;
    }
    
    // Validaciones según el estado actual y nuevo
    if (compra.estado === 'anulado') {
      res.status(400).json({ message: 'No se puede cambiar el estado de una compra anulada' });
      return;
    }
    
    if (estado === 'recibido' || estado === 'pagado') {
      res.status(400).json({ 
        message: `Use los endpoints específicos para cambiar a estado '${estado}'` 
      });
      return;
    }
    
    compra.estado = estado;
    await compra.save();
    
    res.json({ 
      message: `Estado actualizado a: ${estado}`,
      compra 
    });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ 
      message: 'Error al cambiar estado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Eliminar compra (solo si está en estado presupuesto)
export const deleteCompra = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const compra = await Compra.findById(id);
    if (!compra) {
      res.status(404).json({ message: 'Compra no encontrada' });
      return;
    }
    
    if (compra.estado !== 'presupuesto') {
      res.status(400).json({ 
        message: `Solo se pueden eliminar compras en estado 'presupuesto'. Use anular para otros estados.` 
      });
      return;
    }
    
    await Compra.findByIdAndDelete(id);
    
    res.json({ message: 'Compra eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar compra:', error);
    res.status(500).json({ 
      message: 'Error al eliminar compra',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// Obtener estadísticas de compras
export const getEstadisticasCompras = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    const filtros: any = {};
    if (fechaDesde || fechaHasta) {
      filtros.fecha = {};
      if (fechaDesde) filtros.fecha.$gte = new Date(fechaDesde as string);
      if (fechaHasta) filtros.fecha.$lte = new Date(fechaHasta as string);
    }
    
    const estadisticas = await Compra.aggregate([
      { $match: filtros },
      {
        $group: {
          _id: '$estado',
          cantidad: { $sum: 1 },
          totalMonto: { $sum: '$total' }
        }
      }
    ]);
    
    const totalCompras = await Compra.countDocuments(filtros);
    const montoTotal = await Compra.aggregate([
      { $match: { ...filtros, estado: { $ne: 'anulado' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    res.json({
      totalCompras,
      montoTotal: montoTotal[0]?.total || 0,
      porEstado: estadisticas
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
