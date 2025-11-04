import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import Remito from '../models/Remito.js';
import Venta from '../models/Venta.js';
import Cliente from '../models/Cliente.js';
import mongoose from 'mongoose';

// @desc    Obtener todos los remitos
// @route   GET /api/remitos
// @access  Private
export const getRemitos = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { estado, repartidor, fechaInicio, fechaFin } = req.query;

    const filtros: any = {};

    if (estado) {
      filtros.estado = estado;
    }

    if (repartidor) {
      filtros.repartidor = new RegExp(repartidor as string, 'i');
    }

    if (fechaInicio || fechaFin) {
      filtros.fecha = {};
      if (fechaInicio) {
        filtros.fecha.$gte = new Date(fechaInicio as string);
      }
      if (fechaFin) {
        filtros.fecha.$lte = new Date(fechaFin as string);
      }
    }

    const remitos = await Remito.find(filtros)
      .populate('clienteId', 'razonSocial nombre apellido numeroDocumento')
      .populate('ventaId', 'numeroVenta total medioPago')
      .sort({ fecha: -1 });

    res.json(remitos);
  } catch (error) {
    console.error('Error al obtener remitos:', error);
    res.status(500).json({ message: 'Error al obtener remitos' });
  }
};

// @desc    Obtener un remito por ID
// @route   GET /api/remitos/:id
// @access  Private
export const getRemitoById = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const remito = await Remito.findById(req.params.id)
      .populate('clienteId')
      .populate('ventaId')
      .populate('items.productoId');

    if (!remito) {
      return res.status(404).json({ message: 'Remito no encontrado' });
    }

    res.json(remito);
  } catch (error) {
    console.error('Error al obtener remito:', error);
    res.status(500).json({ message: 'Error al obtener remito' });
  }
};

// @desc    Generar remito desde una venta
// @route   POST /api/remitos/desde-venta
// @access  Private (admin/oper_ad/oper)
export const generarRemitoDesdeVenta = async (req: ExpressRequest, res: ExpressResponse) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { ventaId, direccionEntrega, repartidor, vehiculo, observaciones, creadoPor } = req.body;

    // Validaciones básicas
    if (!ventaId || !creadoPor) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'La venta y el creador son obligatorios' });
    }

    // Verificar que la venta existe
    const venta = await Venta.findById(ventaId).session(session);
    if (!venta) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Venta no encontrada' });
    }

    // Verificar si ya tiene remito
    if (venta.remitoId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Esta venta ya tiene un remito generado' });
    }

    // Obtener datos del cliente
    const cliente = await Cliente.findById(venta.clienteId).session(session);
    if (!cliente) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Determinar dirección de entrega
    const direccion = direccionEntrega || 
                      venta.direccionEntrega || 
                      cliente.direccionEntrega || 
                      cliente.direccion ||
                      `${cliente.ciudad || ''} ${cliente.provincia || ''}`.trim();

    if (!direccion) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'No se pudo determinar la dirección de entrega' });
    }

    // Preparar items del remito
    const itemsRemito = venta.items.map(item => ({
      productoId: item.productoId,
      codigoProducto: item.codigoProducto,
      nombreProducto: item.nombreProducto,
      cantidadSolicitada: item.cantidad,
      cantidadEntregada: item.cantidad // Por defecto, se entrega todo
    }));

    // Generar número de remito manualmente
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const prefix = `REM-${year}${month}`;

    // Buscar el último remito del mes con la sesión activa
    const ultimoRemito = await Remito.findOne({
      numeroRemito: new RegExp(`^${prefix}`)
    })
      .sort({ numeroRemito: -1 })
      .limit(1)
      .session(session);

    let numeroSecuencial = 1;
    if (ultimoRemito && ultimoRemito.numeroRemito) {
      const partes = ultimoRemito.numeroRemito.split('-');
      const ultimoNumero = partes[2] ? parseInt(partes[2]) : 0;
      numeroSecuencial = ultimoNumero + 1;
    }

    const numeroRemito = `${prefix}-${String(numeroSecuencial).padStart(4, '0')}`;

    // Crear el remito con el número ya generado
    const nuevoRemito = new Remito({
      numeroRemito,
      fecha: new Date(),
      ventaId: venta._id,
      clienteId: venta.clienteId,
      nombreCliente: venta.nombreCliente,
      documentoCliente: venta.documentoCliente,
      direccionEntrega: direccion,
      items: itemsRemito,
      estado: 'pendiente',
      repartidor,
      vehiculo,
      observaciones,
      creadoPor
    });

    const remitoGuardado = await nuevoRemito.save({ session });

    // Actualizar la venta con el remito y cambiar estado de entrega
    venta.remitoId = remitoGuardado._id as mongoose.Types.ObjectId;
    venta.estadoEntrega = 'remito_generado';
    venta.direccionEntrega = direccion;
    await venta.save({ session });

    await session.commitTransaction();

    const remitoCompleto = await Remito.findById(remitoGuardado._id)
      .populate('clienteId')
      .populate('ventaId');

    res.status(201).json(remitoCompleto);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al generar remito:', error);
    res.status(500).json({ 
      message: 'Error al generar remito',
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};

// @desc    Actualizar estado del remito
// @route   PATCH /api/remitos/:id/estado
// @access  Private (admin/oper_ad/oper)
export const actualizarEstadoRemito = async (req: ExpressRequest, res: ExpressResponse) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { estado, nombreReceptor, dniReceptor, firmaDigital, motivoCancelacion, modificadoPor } = req.body;

    if (!estado || !modificadoPor) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'El estado y modificador son obligatorios' });
    }

    const remito = await Remito.findById(req.params.id).session(session);
    if (!remito) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Remito no encontrado' });
    }

    // Validar que el estado sea diferente al actual
    if (remito.estado === estado) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: `El remito ya se encuentra en estado "${estado}"` 
      });
    }

    // Actualizar campos según el nuevo estado
    remito.estado = estado;
    remito.modificadoPor = modificadoPor;

    if (estado === 'en_transito' && !remito.horaDespacho) {
      remito.horaDespacho = new Date();
    }

    if (estado === 'entregado') {
      remito.horaEntrega = new Date();
      if (nombreReceptor) remito.nombreReceptor = nombreReceptor;
      if (dniReceptor) remito.dniReceptor = dniReceptor;
      if (firmaDigital) remito.firmaDigital = firmaDigital;

      // Actualizar estado de entrega en la venta
      const venta = await Venta.findById(remito.ventaId).session(session);
      if (venta) {
        venta.estadoEntrega = 'entregado';
        venta.fechaEntrega = new Date();
        await venta.save({ session });
      }
    }

    if (estado === 'cancelado') {
      if (!motivoCancelacion) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'El motivo de cancelación es obligatorio' });
      }
      remito.motivoCancelacion = motivoCancelacion;

      // Actualizar estado de entrega en la venta
      const venta = await Venta.findById(remito.ventaId).session(session);
      if (venta) {
        venta.estadoEntrega = 'sin_remito';
        venta.set('remitoId', undefined);
        await venta.save({ session });
      }
    }

    await remito.save({ session });
    await session.commitTransaction();

    const remitoActualizado = await Remito.findById(remito._id)
      .populate('clienteId')
      .populate('ventaId');

    res.json(remitoActualizado);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al actualizar estado del remito:', error);
    res.status(500).json({ 
      message: error.message || 'Error al actualizar estado del remito' 
    });
  } finally {
    session.endSession();
  }
};

// @desc    Actualizar items entregados del remito
// @route   PATCH /api/remitos/:id/items
// @access  Private (admin/oper_ad/oper)
export const actualizarItemsRemito = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { items, modificadoPor } = req.body;

    if (!items || !Array.isArray(items) || !modificadoPor) {
      return res.status(400).json({ message: 'Los items y modificador son obligatorios' });
    }

    const remito = await Remito.findById(req.params.id);
    if (!remito) {
      return res.status(404).json({ message: 'Remito no encontrado' });
    }

    if (remito.estado !== 'pendiente' && remito.estado !== 'en_transito') {
      return res.status(400).json({ 
        message: 'Solo se pueden modificar items en remitos pendientes o en tránsito' 
      });
    }

    // Actualizar cantidades entregadas
    items.forEach((itemActualizado: any) => {
      const item = remito.items.find(
        i => i.productoId.toString() === itemActualizado.productoId
      );
      if (item) {
        item.cantidadEntregada = itemActualizado.cantidadEntregada;
        if (itemActualizado.observacion) {
          item.observacion = itemActualizado.observacion;
        }
      }
    });

    remito.modificadoPor = modificadoPor;
    await remito.save();

    const remitoActualizado = await Remito.findById(remito._id)
      .populate('clienteId')
      .populate('ventaId');

    res.json(remitoActualizado);
  } catch (error: any) {
    console.error('Error al actualizar items del remito:', error);
    res.status(500).json({ 
      message: error.message || 'Error al actualizar items del remito' 
    });
  }
};

// @desc    Eliminar remito (solo admin)
// @route   DELETE /api/remitos/:id
// @access  Private (admin only)
export const eliminarRemito = async (req: ExpressRequest, res: ExpressResponse) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const remito = await Remito.findById(req.params.id).session(session);
    
    if (!remito) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Remito no encontrado' });
    }

    if (remito.estado === 'entregado') {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'No se puede eliminar un remito que ya fue entregado' 
      });
    }

    // Actualizar la venta asociada
    const venta = await Venta.findById(remito.ventaId).session(session);
    if (venta) {
      venta.set('remitoId', undefined);
      venta.estadoEntrega = 'sin_remito';
      await venta.save({ session });
    }

    await Remito.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();

    res.json({ message: 'Remito eliminado correctamente' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error al eliminar remito:', error);
    res.status(500).json({ message: 'Error al eliminar remito' });
  } finally {
    session.endSession();
  }
};

// @desc    Obtener estadísticas de remitos
// @route   GET /api/remitos/estadisticas
// @access  Private
export const getEstadisticasRemitos = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const estadisticas = await Remito.aggregate([
      {
        $group: {
          _id: '$estado',
          cantidad: { $sum: 1 }
        }
      }
    ]);

    const resultado = {
      pendientes: 0,
      en_transito: 0,
      entregados: 0,
      devueltos: 0,
      cancelados: 0,
      total: 0
    };

    estadisticas.forEach(stat => {
      resultado[stat._id as keyof typeof resultado] = stat.cantidad;
      resultado.total += stat.cantidad;
    });

    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener estadísticas de remitos:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};
