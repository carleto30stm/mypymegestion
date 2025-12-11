import type { Request, Response } from 'express';
import OrdenProduccion from '../models/OrdenProduccion.js';
import Receta from '../models/Receta.js';
import MateriaPrima from '../models/MateriaPrima.js';
import Producto from '../models/Producto.js';
import MovimientoInventario from '../models/MovimientoInventario.js';
import Proveedor from '../models/Proveedor.js';
import MovimientoCuentaCorrienteProveedor from '../models/MovimientoCuentaCorrienteProveedor.js';
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
      .populate('proveedorId', 'razonSocial')
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
      .populate('recetaId')
      .populate('proveedorId', 'razonSocial');

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

    // Verificar si es producción externa
    const esProduccionExterna = req.body.esProduccionExterna || false;
    const proveedorId = req.body.proveedorId;
    const costoUnitarioManoObraExterna = req.body.costoUnitarioManoObraExterna || 0;

    // Si es producción externa, RESERVAR materias primas (no consumir aún)
    if (esProduccionExterna) {
      for (const item of materiasPrimasOrden) {
        const mp = await MateriaPrima.findById(item.materiaPrimaId).session(session);
        if (!mp) continue;
        
        // Reservar el stock (disminuir disponible pero no consumir)
        mp.stock -= item.cantidadNecesaria;
        await mp.save({ session });

        // Registrar movimiento de reserva
        await MovimientoInventario.create([{
          fecha: new Date(),
          tipo: 'reserva_produccion_externa',
          materiaPrimaId: mp._id,
          codigoMateriaPrima: mp.codigo,
          nombreMateriaPrima: mp.nombre,
          cantidad: item.cantidadNecesaria,
          unidadMedida: mp.unidadMedida,
          stockAnterior: mp.stock + item.cantidadNecesaria,
          stockNuevo: mp.stock,
          precioUnitario: item.costo,
          valor: item.costo * item.cantidadNecesaria,
          documentoOrigen: 'orden_produccion_externa',
          documentoOrigenId: null, // Se actualiza después
          numeroDocumento: 'Pendiente',
          observaciones: `Reserva para producción externa - ${producto.nombre}`,
          responsable: responsable,
          usuario: createdBy
        }], { session });

        // Marcar como reservada
        item.cantidadReservada = item.cantidadNecesaria;
      }
    }

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
      esProduccionExterna,
      proveedorId: esProduccionExterna ? proveedorId : undefined,
      costoUnitarioManoObraExterna: esProduccionExterna ? costoUnitarioManoObraExterna : 0,
      createdBy
    });

    await nuevaOrden.save({ session });

    // Actualizar movimientos con el ID de la orden creada
    if (esProduccionExterna) {
      await MovimientoInventario.updateMany(
        { documentoOrigenId: null, documentoOrigen: 'orden_produccion_externa' },
        { $set: { documentoOrigenId: nuevaOrden._id, numeroDocumento: nuevaOrden.numeroOrden } },
        { session }
      );
    }
    
    // Populate antes de hacer commit
    const ordenPopulada = await OrdenProduccion.findById(nuevaOrden._id)
      .session(session)
      .populate('productoId', 'codigo nombre precioVenta')
      .populate('recetaId', 'version rendimiento')
      .populate('proveedorId', 'razonSocial');

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

// Editar orden de producción (solo si está en estado 'planificada')
export const editarOrden = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { 
      cantidadAProducir,
      prioridad,
      responsable,
      observaciones,
      proveedorId,
      costoUnitarioManoObraExterna
    } = req.body;

    const orden = await OrdenProduccion.findById(id).session(session);
    if (!orden) {
      await session.abortTransaction();
      return res.status(404).json({ mensaje: 'Orden de producción no encontrada' });
    }

    if (orden.estado !== 'planificada') {
      await session.abortTransaction();
      return res.status(400).json({ 
        mensaje: `Solo se pueden editar órdenes en estado 'planificada'. Estado actual: ${orden.estado}` 
      });
    }

    // Si es producción externa y cambió la cantidad, necesitamos ajustar las reservas de MP
    if (orden.esProduccionExterna && cantidadAProducir && cantidadAProducir !== orden.cantidadAProducir) {
      // Liberar reservas anteriores
      for (const item of orden.materiasPrimas) {
        if (item.cantidadReservada > 0) {
          const mp = await MateriaPrima.findById(item.materiaPrimaId).session(session);
          if (mp) {
            mp.stock += item.cantidadReservada;
            await mp.save({ session });
          }
        }
      }

      // Recalcular cantidades necesarias según nueva cantidad
      const receta = await Receta.findById(orden.recetaId).session(session);
      if (!receta) {
        throw new Error('Receta no encontrada');
      }

      for (const item of orden.materiasPrimas) {
        const cantidadNecesaria = receta.materiasPrimas.find(
          mp => mp.materiaPrimaId.toString() === item.materiaPrimaId.toString()
        )!.cantidad * cantidadAProducir;

        const mp = await MateriaPrima.findById(item.materiaPrimaId).session(session);
        if (!mp) {
          throw new Error(`Materia prima no encontrada: ${item.nombreMateriaPrima}`);
        }

        if (mp.stock < cantidadNecesaria) {
          throw new Error(
            `Stock insuficiente de ${mp.nombre}. ` +
            `Necesario: ${cantidadNecesaria}, Disponible: ${mp.stock}`
          );
        }

        // Reservar nuevo stock
        mp.stock -= cantidadNecesaria;
        await mp.save({ session });

        // Actualizar cantidades en la orden
        item.cantidadNecesaria = cantidadNecesaria;
        item.cantidadReservada = cantidadNecesaria;
      }

      orden.cantidadAProducir = cantidadAProducir;
    }

    // Actualizar campos editables
    if (prioridad) orden.prioridad = prioridad as any;
    if (responsable !== undefined) orden.responsable = responsable;
    if (observaciones !== undefined) orden.observaciones = observaciones;
    if (orden.esProduccionExterna) {
      if (proveedorId) orden.proveedorId = proveedorId as any;
      if (costoUnitarioManoObraExterna !== undefined) orden.costoUnitarioManoObraExterna = costoUnitarioManoObraExterna;
    }

    await orden.save({ session });
    await session.commitTransaction();

    const ordenActualizada = await OrdenProduccion.findById(id)
      .populate('productoId', 'codigo nombre precioVenta')
      .populate('recetaId', 'version rendimiento')
      .populate('proveedorId', 'razonSocial');

    res.json(ordenActualizada);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al editar orden:', error);
    res.status(500).json({ 
      mensaje: 'Error al editar orden de producción', 
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
      .populate('recetaId', 'version rendimiento')
      .populate('proveedorId', 'razonSocial');

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

    // Validar estado según tipo de producción
    if (orden.esProduccionExterna) {
      // Para producción externa, debe estar 'enviada' (ya en el proveedor)
      if (orden.estado !== 'enviada') {
        await session.abortTransaction();
        return res.status(400).json({ 
          mensaje: `No se puede completar orden externa en estado: ${orden.estado}. Debe estar 'enviada'.` 
        });
      }
      // Para producción externa NO consumir MP (ya se reservó al crear), solo incrementar producto terminado
    } else {
      // Para producción interna, debe estar 'en_proceso'
      if (orden.estado !== 'en_proceso') {
        await session.abortTransaction();
        return res.status(400).json({ 
          mensaje: `No se puede completar una orden en estado: ${orden.estado}` 
        });
      }
    }

    // Consumir materias primas SOLO si es producción interna
    if (!orden.esProduccionExterna) {
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
    }

    // Actualizar el producto (incrementar stock - aplica para ambos tipos)
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

    // NO registrar en CC proveedor aquí - ya se registró al enviar la orden

    await session.commitTransaction();

    const ordenCompletada = await OrdenProduccion.findById(id)
      .populate('productoId', 'codigo nombre precioVenta stock')
      .populate('recetaId', 'version rendimiento')
      .populate('proveedorId', 'razonSocial');

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

    // Si es producción externa y hay MP reservadas, LIBERAR el stock
    if (orden.esProduccionExterna && orden.estado === 'planificada') {
      for (const item of orden.materiasPrimas) {
        if (item.cantidadReservada > 0) {
          const mp = await MateriaPrima.findById(item.materiaPrimaId).session(session);
          if (!mp) continue;

          // Devolver stock reservado
          const stockAnterior = mp.stock;
          mp.stock += item.cantidadReservada;
          await mp.save({ session });

          // Registrar movimiento de liberación
          await MovimientoInventario.create([{
            fecha: new Date(),
            tipo: 'liberacion_reserva',
            materiaPrimaId: mp._id,
            codigoMateriaPrima: mp.codigo,
            nombreMateriaPrima: mp.nombre,
            cantidad: item.cantidadReservada,
            unidadMedida: mp.unidadMedida,
            stockAnterior,
            stockNuevo: mp.stock,
            precioUnitario: item.costo,
            valor: item.costo * item.cantidadReservada,
            documentoOrigen: 'cancelacion_orden_externa',
            documentoOrigenId: orden._id,
            numeroDocumento: orden.numeroOrden,
            observaciones: `Liberación por cancelación - ${orden.nombreProducto}. Motivo: ${motivoCancelacion}`,
            responsable: orden.responsable,
            usuario: req.body.canceladoPor || 'sistema'
          }], { session });
        }
      }
    }

    // Si la orden ya estaba en proceso y consumió MP, NO devolver (ya está consumido)
    orden.estado = 'cancelada';
    orden.motivoCancelacion = motivoCancelacion;
    await orden.save({ session });

    await session.commitTransaction();

    const ordenCancelada = await OrdenProduccion.findById(id)
      .populate('productoId', 'codigo nombre precioVenta')
      .populate('recetaId', 'version rendimiento')
      .populate('proveedorId', 'razonSocial');

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

// Enviar orden a proveedor externo (registra deuda en cuenta corriente)
export const enviarOrdenAProveedor = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { enviadoPor } = req.body;

    if (!enviadoPor) {
      await session.abortTransaction();
      return res.status(400).json({ mensaje: 'El usuario que envía es obligatorio' });
    }

    const orden = await OrdenProduccion.findById(id).session(session);
    if (!orden) {
      await session.abortTransaction();
      return res.status(404).json({ mensaje: 'Orden de producción no encontrada' });
    }

    if (!orden.esProduccionExterna) {
      await session.abortTransaction();
      return res.status(400).json({ mensaje: 'Solo se pueden enviar órdenes de producción externa' });
    }

    if (orden.estado !== 'planificada') {
      await session.abortTransaction();
      return res.status(400).json({ mensaje: `No se puede enviar una orden en estado: ${orden.estado}` });
    }

    if (!orden.proveedorId) {
      await session.abortTransaction();
      return res.status(400).json({ mensaje: 'La orden no tiene proveedor asignado' });
    }

    if (!orden.costoUnitarioManoObraExterna || orden.costoUnitarioManoObraExterna <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ mensaje: 'La orden debe tener un costo unitario de mano de obra externa' });
    }

    // Calcular costo total de mano de obra externa
    const costoTotalManoObraExterna = orden.costoUnitarioManoObraExterna * orden.cantidadAProducir;

    const proveedor = await Proveedor.findById(orden.proveedorId).session(session);
    if (!proveedor) {
      await session.abortTransaction();
      return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    }

    // Obtener el último saldo del proveedor
    const ultimoMovimiento = await MovimientoCuentaCorrienteProveedor
      .findOne({ proveedorId: orden.proveedorId, anulado: false })
      .sort({ fecha: -1, _id: -1 })
      .session(session);

    const saldoAnterior = ultimoMovimiento ? ultimoMovimiento.saldo : 0;
    const nuevoSaldo = saldoAnterior + costoTotalManoObraExterna; // Aumenta deuda (debemos al proveedor)

    // Crear movimiento en cuenta corriente del proveedor
    await MovimientoCuentaCorrienteProveedor.create([{
      proveedorId: orden.proveedorId,
      fecha: new Date(),
      tipo: 'servicio_procesamiento',
      documentoTipo: 'ORDEN_PRODUCCION',
      documentoNumero: orden.numeroOrden,
      documentoId: orden._id,
      concepto: `Procesamiento externo - ${orden.nombreProducto} (${orden.cantidadAProducir} unidades) - $${orden.costoUnitarioManoObraExterna}/u`,
      observaciones: `Orden enviada a proveedor. Costo unitario: $${orden.costoUnitarioManoObraExterna}, Cantidad: ${orden.cantidadAProducir}, Total: $${costoTotalManoObraExterna}`,
      debe: 0,
      haber: costoTotalManoObraExterna, // Aumenta deuda
      saldo: nuevoSaldo,
      creadoPor: enviadoPor,
      anulado: false
    }], { session });

    // Actualizar saldo del proveedor
    proveedor.saldoCuenta = nuevoSaldo;
    await proveedor.save({ session });

    // Cambiar estado de la orden a 'enviada'
    orden.estado = 'enviada';
    orden.fechaEnvio = new Date();
    await orden.save({ session });

    await session.commitTransaction();

    const ordenActualizada = await OrdenProduccion.findById(id)
      .populate('productoId', 'codigo nombre precioVenta')
      .populate('recetaId', 'version rendimiento')
      .populate('proveedorId', 'razonSocial');

    res.json(ordenActualizada);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al enviar orden a proveedor:', error);
    res.status(500).json({ 
      mensaje: 'Error al enviar orden a proveedor', 
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
