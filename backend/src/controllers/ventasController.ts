import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import Venta from '../models/Venta.js';
import Producto from '../models/Producto.js';
import Cliente from '../models/Cliente.js';
import Gasto from '../models/Gasto.js';
import MovimientoCuentaCorriente from '../models/MovimientoCuentaCorriente.js';
import mongoose from 'mongoose';

// @desc    Obtener todas las ventas
// @route   GET /api/ventas
// @access  Private
export const getVentas = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const ventas = await Venta.find()
            .populate('clienteId', 'nombreCompleto numeroDocumento')
            .sort({ fecha: -1 });
        res.json(ventas);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Obtener ventas por rango de fechas
// @route   GET /api/ventas/rango
// @access  Private
export const getVentasByRango = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        if (!fechaInicio || !fechaFin) {
            return res.status(400).json({ message: 'fechaInicio y fechaFin son requeridos' });
        }

        const ventas = await Venta.find({
            fecha: {
                $gte: new Date(fechaInicio as string),
                $lte: new Date(fechaFin as string)
            }
        })
            .populate('clienteId', 'nombreCompleto numeroDocumento')
            .sort({ fecha: -1 });

        res.json(ventas);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Obtener una venta por ID
// @route   GET /api/ventas/:id
// @access  Private
export const getVentaById = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const venta = await Venta.findById(req.params.id)
            .populate('clienteId')
            .populate('items.productoId');

        if (venta) {
            res.json(venta);
        } else {
            res.status(404).json({ message: 'Venta no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Crear una nueva venta
// @route   POST /api/ventas
// @access  Private (admin/oper_ad/oper)
export const crearVenta = async (req: ExpressRequest, res: ExpressResponse) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { clienteId, items, observaciones, vendedor, aplicaIVA } = req.body;

        // Validaciones básicas
        if (!clienteId || !items || items.length === 0 || !vendedor) {
            await session.abortTransaction();
            return res.status(400).json({ 
                message: 'Cliente, items y vendedor son requeridos' 
            });
        }

        // Verificar que el cliente existe
        const cliente = await Cliente.findById(clienteId).session(session);
        if (!cliente) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        const nombreCliente = cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre}`.trim();

        // Validar stock y preparar items
        const itemsVenta = [];
        let subtotalVenta = 0;

        for (const item of items) {
            const producto = await Producto.findById(item.productoId).session(session);
            
            if (!producto) {
                await session.abortTransaction();
                return res.status(404).json({ 
                    message: `Producto ${item.productoId} no encontrado` 
                });
            }

            if (producto.estado !== 'activo') {
                await session.abortTransaction();
                return res.status(400).json({ 
                    message: `El producto ${producto.nombre} no está activo` 
                });
            }

            if (producto.stock < item.cantidad) {
                await session.abortTransaction();
                return res.status(400).json({ 
                    message: `Stock insuficiente para ${producto.nombre}. Stock disponible: ${producto.stock}` 
                });
            }

            // Calcular subtotal y total del item
            const precioUnitario = item.precioUnitario || producto.precioVenta;
            const subtotal = precioUnitario * item.cantidad;
            const descuento = item.descuento || 0;
            const total = subtotal - descuento;

            itemsVenta.push({
                productoId: producto._id as mongoose.Types.ObjectId,
                codigoProducto: producto.codigo,
                nombreProducto: producto.nombre,
                cantidad: item.cantidad,
                precioUnitario,
                subtotal,
                descuento,
                total
            });

            subtotalVenta += subtotal;

            // NO descontar stock aquí - se descuenta al confirmar la venta
            // producto.stock -= item.cantidad;
            // await producto.save({ session });
        }

        // Calcular totales
        const descuentoTotal = itemsVenta.reduce((sum, item) => sum + item.descuento, 0);
        
        // Calcular IVA basado en la condición fiscal del cliente
        // Si aplicaIVA es false (cliente exento) o no viene el campo, IVA = 0
        const ivaCalculado = (aplicaIVA === true) ? (subtotalVenta - descuentoTotal) * 0.21 : 0;
        const totalVenta = subtotalVenta - descuentoTotal + ivaCalculado;

        // Estado inicial siempre es 'pendiente'
        // El usuario debe confirmar manualmente en el historial
        const estadoVenta = 'pendiente';

        // Crear venta
        // El cobro se gestiona posteriormente en el módulo de Cobranzas
        const nuevaVenta = new Venta({
            fecha: new Date(),
            clienteId,
            nombreCliente,
            documentoCliente: cliente.numeroDocumento,
            items: itemsVenta,
            subtotal: subtotalVenta,
            descuentoTotal,
            iva: ivaCalculado,
            total: totalVenta,
            observaciones,
            vendedor,
            estado: estadoVenta,
            aplicaIVA: aplicaIVA === true,
            creadoPor: req.user?.username, // Registrar usuario que crea la venta
            // Campos de cobranza se actualizan desde ReciboPago
            estadoCobranza: 'sin_cobrar',
            montoCobrado: 0,
            saldoPendiente: totalVenta
        });

        const ventaGuardada = await nuevaVenta.save({ session });

        await session.commitTransaction();

        res.status(201).json({
            message: 'Venta creada exitosamente',
            venta: ventaGuardada
        });
    } catch (error: any) {
        await session.abortTransaction();
        res.status(500).json({ 
            message: 'Error al crear la venta', 
            details: error.message 
        });
    } finally {
        session.endSession();
    }
};

// @desc    Actualizar una venta (solo ventas pendientes)
// @route   PUT /api/ventas/:id
// @access  Private (admin/oper_ad)
export const actualizarVenta = async (req: ExpressRequest, res: ExpressResponse) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { clienteId, items, observaciones, aplicaIVA } = req.body;

        // Buscar la venta existente
        const ventaExistente = await Venta.findById(id).session(session);
        
        if (!ventaExistente) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        // Solo se pueden editar ventas pendientes
        if (ventaExistente.estado !== 'pendiente') {
            await session.abortTransaction();
            return res.status(400).json({ 
                message: 'Solo se pueden editar ventas en estado pendiente' 
            });
        }

        // Validaciones básicas
        if (!clienteId || !items || items.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ 
                message: 'Cliente e items son requeridos' 
            });
        }

        // Verificar que el cliente existe
        const cliente = await Cliente.findById(clienteId).session(session);
        if (!cliente) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        const nombreCliente = cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre}`.trim();

        // Validar stock (sin descontar, solo validar disponibilidad)
        const itemsVenta = [];
        let subtotalVenta = 0;

        for (const item of items) {
            const producto = await Producto.findById(item.productoId).session(session);
            
            if (!producto) {
                await session.abortTransaction();
                return res.status(404).json({ 
                    message: `Producto ${item.productoId} no encontrado` 
                });
            }

            if (producto.estado !== 'activo') {
                await session.abortTransaction();
                return res.status(400).json({ 
                    message: `El producto ${producto.nombre} no está activo` 
                });
            }

            if (producto.stock < item.cantidad) {
                await session.abortTransaction();
                return res.status(400).json({ 
                    message: `Stock insuficiente para ${producto.nombre}. Stock disponible: ${producto.stock}` 
                });
            }

            // Calcular subtotal y total del item
            const precioUnitario = item.precioUnitario || producto.precioVenta;
            const subtotal = precioUnitario * item.cantidad;
            const descuento = item.descuento || 0;
            const total = subtotal - descuento;

            itemsVenta.push({
                productoId: producto._id as mongoose.Types.ObjectId,
                codigoProducto: producto.codigo,
                nombreProducto: producto.nombre,
                cantidad: item.cantidad,
                precioUnitario,
                subtotal,
                descuento,
                total,
                porcentajeDescuento: item.porcentajeDescuento || 0
            });

            subtotalVenta += subtotal;
        }

        // Calcular totales
        const descuentoTotal = itemsVenta.reduce((sum, item) => sum + item.descuento, 0);
        const ivaCalculado = (aplicaIVA === true) ? (subtotalVenta - descuentoTotal) * 0.21 : 0;
        const totalVenta = subtotalVenta - descuentoTotal + ivaCalculado;

        // Actualizar la venta
        ventaExistente.clienteId = clienteId;
        ventaExistente.nombreCliente = nombreCliente;
        ventaExistente.documentoCliente = cliente.numeroDocumento;
        ventaExistente.items = itemsVenta;
        ventaExistente.subtotal = subtotalVenta;
        ventaExistente.descuentoTotal = descuentoTotal;
        ventaExistente.iva = ivaCalculado;
        ventaExistente.total = totalVenta;
        ventaExistente.observaciones = observaciones;
        ventaExistente.aplicaIVA = aplicaIVA === true;
        ventaExistente.saldoPendiente = totalVenta; // Recalcular saldo pendiente

        const ventaActualizada = await ventaExistente.save({ session });

        await session.commitTransaction();

        res.json({
            message: 'Venta actualizada exitosamente',
            venta: ventaActualizada
        });
    } catch (error: any) {
        await session.abortTransaction();
        res.status(500).json({ 
            message: 'Error al actualizar la venta', 
            details: error.message 
        });
    } finally {
        session.endSession();
    }
};

// @desc    Anular una venta
// @route   PATCH /api/ventas/:id/anular
// @access  Private (admin)
export const anularVenta = async (req: ExpressRequest, res: ExpressResponse) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { motivoAnulacion, usuarioAnulacion } = req.body;

        if (!motivoAnulacion) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'El motivo de anulación es requerido' });
        }

        if (!usuarioAnulacion) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'El usuario que anula es requerido' });
        }

        const venta = await Venta.findById(req.params.id).session(session);

        if (!venta) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        if (venta.estado === 'anulada') {
            await session.abortTransaction();
            return res.status(400).json({ message: 'La venta ya está anulada' });
        }

        // Restaurar stock
        for (const item of venta.items) {
            const producto = await Producto.findById(item.productoId).session(session);
            if (producto) {
                producto.stock += item.cantidad;
                await producto.save({ session });
            }
        }

        // Si es cuenta corriente, revertir saldo del cliente
        if (venta.medioPago === 'CUENTA CORRIENTE') {
            const cliente = await Cliente.findById(venta.clienteId).session(session);
            if (cliente) {
                cliente.saldoCuenta -= venta.total;
                
                // Actualizar estado si corresponde
                if (cliente.estado === 'moroso' && cliente.saldoCuenta <= cliente.limiteCredito) {
                    cliente.estado = 'activo';
                }
                
                await cliente.save({ session });
            }
        }

        // Si tiene gasto relacionado, marcarlo como cancelado
        if (venta.gastoRelacionadoId) {
            const gasto = await Gasto.findById(venta.gastoRelacionadoId).session(session);
            if (gasto) {
                gasto.estado = 'cancelado';
                gasto.comentario = `Venta ${venta.numeroVenta} anulada: ${motivoAnulacion}`;
                await gasto.save({ session });
            }
        }

        // Actualizar estado de la venta
        venta.estado = 'anulada';
        venta.fechaAnulacion = new Date();
        venta.motivoAnulacion = motivoAnulacion;
        venta.usuarioAnulacion = usuarioAnulacion;
        await venta.save({ session });

        await session.commitTransaction();

        res.json({
            message: 'Venta anulada exitosamente',
            venta
        });
    } catch (error: any) {
        await session.abortTransaction();
        res.status(500).json({ 
            message: 'Error al anular la venta', 
            details: error.message 
        });
    } finally {
        session.endSession();
    }
};

// @desc    Registrar pago parcial/total de cuenta corriente
// @route   PATCH /api/ventas/:id/registrar-pago
// @access  Private (admin/oper_ad)
export const registrarPago = async (req: ExpressRequest, res: ExpressResponse) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { montoPago, medioPago, banco, observaciones } = req.body;

        if (!montoPago || !medioPago) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Monto y medio de pago son requeridos' });
        }

        const venta = await Venta.findById(req.params.id).session(session);

        if (!venta) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        if (venta.estado === 'anulada') {
            await session.abortTransaction();
            return res.status(400).json({ message: 'No se puede registrar pago en una venta anulada' });
        }

        if (venta.medioPago !== 'CUENTA CORRIENTE' && venta.estado !== 'parcial') {
            await session.abortTransaction();
            return res.status(400).json({ 
                message: 'Esta venta no tiene saldo pendiente' 
            });
        }

        // Actualizar saldo del cliente
        const cliente = await Cliente.findById(venta.clienteId).session(session);
        if (!cliente) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        const nombreCliente = cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre}`.trim();

        cliente.saldoCuenta -= montoPago;
        
        // Actualizar estado si corresponde
        if (cliente.estado === 'moroso' && cliente.saldoCuenta <= cliente.limiteCredito) {
            cliente.estado = 'activo';
        }
        
        await cliente.save({ session });

        // Si el pago cubre el total de la venta, cambiar estado a confirmada
        // (En un sistema más complejo, deberías trackear los pagos parciales)
        if (montoPago >= venta.total) {
            venta.estado = 'confirmada';
        }

        await venta.save({ session });

        // Crear registro en Gasto por el pago recibido
        const nuevoGasto = new Gasto({
            fecha: new Date(),
            rubro: 'COBRO.VENTA',
            subRubro: 'COBRO',
            medioDePago: medioPago,
            banco: banco || 'EFECTIVO',
            entrada: montoPago,
            salida: 0,
            detalleGastos: `Pago de venta ${venta.numeroVenta} - Cliente: ${nombreCliente}${observaciones ? ` - ${observaciones}` : ''}`,
            tipoOperacion: 'entrada',
            confirmado: true,
            fechaStandBy: null
        });

        await nuevoGasto.save({ session });

        await session.commitTransaction();

        res.json({
            message: 'Pago registrado exitosamente',
            venta,
            pago: {
                monto: montoPago,
                medioPago,
                saldoRestante: cliente.saldoCuenta
            }
        });
    } catch (error: any) {
        await session.abortTransaction();
        res.status(500).json({ 
            message: 'Error al registrar el pago', 
            details: error.message 
        });
    } finally {
        session.endSession();
    }
};

// @desc    Obtener estadísticas de ventas
// @route   GET /api/ventas/estadisticas
// @access  Private
export const getEstadisticasVentas = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        const filtroFecha: any = {};
        if (fechaInicio && fechaFin) {
            filtroFecha.fecha = {
                $gte: new Date(fechaInicio as string),
                $lte: new Date(fechaFin as string)
            };
        }

        const ventas = await Venta.find({
            ...filtroFecha,
            estado: { $ne: 'anulada' }
        });

        const totalVentas = ventas.length;
        const montoTotal = ventas.reduce((sum, v) => sum + v.total, 0);
        const montoPromedio = totalVentas > 0 ? montoTotal / totalVentas : 0;

        const ventasPorEstado = await Venta.aggregate([
            { $match: { ...filtroFecha } },
            { $group: { _id: '$estado', cantidad: { $sum: 1 }, total: { $sum: '$total' } } }
        ]);

        const ventasPorMedioPago = await Venta.aggregate([
            { $match: { ...filtroFecha, estado: { $ne: 'anulada' } } },
            { $group: { _id: '$medioPago', cantidad: { $sum: 1 }, total: { $sum: '$total' } } }
        ]);

        res.json({
            totalVentas,
            montoTotal,
            montoPromedio,
            ventasPorEstado,
            ventasPorMedioPago
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
};

// @route   PATCH /api/ventas/:id/confirmar
// @desc    Confirmar una venta pendiente
// @access  Private (admin/oper_ad)
export const confirmarVenta = async (req: ExpressRequest, res: ExpressResponse) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const {creadoPor, usuarioConfirmacion } = req.body;
        const userId = req.user?._id;

        if (!usuarioConfirmacion) {
            await session.abortTransaction();
            res.status(400).json({ message: 'El usuario de confirmación es requerido' });
            return;
        }

        const venta = await Venta.findById(id).session(session);

        if (!venta) {
            await session.abortTransaction();
            res.status(404).json({ message: 'Venta no encontrada' });
            return;
        }

        if (venta.estado !== 'pendiente') {
            await session.abortTransaction();
            res.status(400).json({ message: `No se puede confirmar una venta en estado ${venta.estado}` });
            return;
        }

        // Validar stock y descontarlo al confirmar
        for (const item of venta.items) {
            const producto = await Producto.findById(item.productoId).session(session);
            
            if (!producto) {
                await session.abortTransaction();
                res.status(404).json({ 
                    message: `Producto ${item.nombreProducto} no encontrado` 
                });
                return;
            }

            if (producto.estado !== 'activo') {
                await session.abortTransaction();
                res.status(400).json({ 
                    message: `El producto ${producto.nombre} no está activo` 
                });
                return;
            }

            if (producto.stock < item.cantidad) {
                await session.abortTransaction();
                res.status(400).json({ 
                    message: `Stock insuficiente para ${producto.nombre}. Stock disponible: ${producto.stock}, requerido: ${item.cantidad}` 
                });
                return;
            }

            // Descontar stock al confirmar
            producto.stock -= item.cantidad;
            await producto.save({ session });
        }

        venta.estado = 'confirmada';
        venta.creadoPor = creadoPor;
        venta.usuarioConfirmacion = usuarioConfirmacion;
        await venta.save({ session });

        // Registrar movimiento en cuenta corriente
        // Obtener saldo anterior del cliente
        const ultimoMovimiento = await MovimientoCuentaCorriente.findOne({
            clienteId: venta.clienteId,
            anulado: false
        }).sort({ fecha: -1, createdAt: -1 }).session(session);

        const saldoAnterior = ultimoMovimiento?.saldo || 0;
        const nuevoSaldo = saldoAnterior + venta.total;

        await MovimientoCuentaCorriente.create([{
            clienteId: venta.clienteId,
            fecha: venta.fecha,
            tipo: 'venta',
            documentoTipo: 'VENTA',
            documentoNumero: venta.numeroVenta,
            documentoId: venta._id,
            concepto: `Venta #${venta.numeroVenta} - ${venta.items.length} items`,
            debe: venta.total,
            haber: 0,
            saldo: nuevoSaldo,
            creadoPor: userId,
            anulado: false
        }], { session });

        // Actualizar saldo del cliente
        await Cliente.findByIdAndUpdate(
            venta.clienteId,
            { saldoCuenta: nuevoSaldo },
            { session }
        );

        await session.commitTransaction();

        res.json({
            message: 'Venta confirmada exitosamente y registrada en cuenta corriente',
            venta
        });
    } catch (error: any) {
        await session.abortTransaction();
        console.error('Error al confirmar venta:', error);
        res.status(500).json({ message: error.message || 'Error al confirmar venta' });
    } finally {
        session.endSession();
    }
};

// @desc    Obtener estadísticas detalladas por productos
// @route   GET /api/ventas/estadisticas-productos
// @access  Private
export const getEstadisticasProductos = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const { fechaInicio, fechaFin, categoria, limit } = req.query;

        // Filtro de fechas
        const filtroFecha: any = {};
        if (fechaInicio && fechaFin) {
            filtroFecha.fecha = {
                $gte: new Date(fechaInicio as string),
                $lte: new Date(fechaFin as string)
            };
        }

        // Filtro de categoría (buscar en productos)
        const filtroCategoria: any = categoria ? { categoria: categoria as string } : {};

        // Pipeline de agregación optimizado
        const estadisticas = await Venta.aggregate([
            // Paso 1: Filtrar ventas confirmadas (no anuladas)
            {
                $match: {
                    ...filtroFecha,
                    estado: 'confirmada'
                }
            },
            // Paso 2: Desenrollar items (un documento por cada producto vendido)
            {
                $unwind: '$items'
            },
            // Paso 3: Lookup para obtener datos actuales del producto
            {
                $lookup: {
                    from: 'productos',
                    localField: 'items.productoId',
                    foreignField: '_id',
                    as: 'producto'
                }
            },
            // Paso 4: Desenrollar el array de producto
            {
                $unwind: {
                    path: '$producto',
                    preserveNullAndEmptyArrays: true // Mantener items aunque el producto ya no exista
                }
            },
            // Paso 5: Filtrar por categoría si se especificó
            ...(categoria ? [{
                $match: {
                    'producto.categoria': categoria as string
                }
            }] : []),
            // Paso 6: Agrupar por producto y calcular métricas
            {
                $group: {
                    _id: '$items.productoId',
                    codigoProducto: { $first: '$items.codigoProducto' },
                    nombreProducto: { $first: '$items.nombreProducto' },
                    categoria: { $first: '$producto.categoria' },
                    
                    // Métricas de cantidad
                    unidadesVendidas: { $sum: '$items.cantidad' },
                    numeroVentas: { $sum: 1 },
                    
                    // Métricas de montos (con IVA incluido)
                    totalVendido: { $sum: '$items.total' },
                    
                    // Precio promedio de venta (real)
                    precioPromedioVenta: { $avg: '$items.precioUnitario' },
                    
                    // Descuentos aplicados
                    totalDescuentos: { $sum: '$items.descuento' },
                    
                    // Datos actuales del producto
                    precioVentaActual: { $first: '$producto.precioVenta' },
                    precioCompraActual: { $first: '$producto.precioCompra' },
                    stockActual: { $first: '$producto.stock' },
                    
                    // Para calcular IVA después (ventas con IVA)
                    ventasConIVA: {
                        $sum: {
                            $cond: [
                                { $eq: ['$aplicaIVA', true] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            // Paso 7: Proyectar campos calculados
            {
                $project: {
                    _id: 1,
                    codigoProducto: 1,
                    nombreProducto: 1,
                    categoria: 1,
                    unidadesVendidas: 1,
                    numeroVentas: 1,
                    totalVendido: 1,
                    totalDescuentos: 1,
                    precioPromedioVenta: { $round: ['$precioPromedioVenta', 2] },
                    precioVentaActual: 1,
                    precioCompraActual: 1,
                    stockActual: 1,
                    
                    // Calcular total neto (sin IVA para análisis de margen)
                    totalNetoSinIVA: {
                        $round: [
                            {
                                $divide: [
                                    '$totalVendido',
                                    1.21 // Aproximación: si >50% ventas con IVA, ajustar
                                ]
                            },
                            2
                        ]
                    },
                    
                    // Calcular costo total estimado (unidades * precio compra actual)
                    costoTotalEstimado: {
                        $multiply: ['$unidadesVendidas', '$precioCompraActual']
                    },
                    
                    // Margen bruto unitario (precio venta actual - precio compra)
                    margenBrutoUnitario: {
                        $subtract: ['$precioVentaActual', '$precioCompraActual']
                    },
                    
                    // Porcentaje margen bruto (sobre precio venta)
                    porcentajeMargenBruto: {
                        $cond: [
                            { $gt: ['$precioVentaActual', 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    { $subtract: ['$precioVentaActual', '$precioCompraActual'] },
                                                    '$precioVentaActual'
                                                ]
                                            },
                                            100
                                        ]
                                    },
                                    2
                                ]
                            },
                            0
                        ]
                    },
                    
                    // Ticket promedio (monto promedio por venta)
                    ticketPromedio: {
                        $round: [
                            { $divide: ['$totalVendido', '$numeroVentas'] },
                            2
                        ]
                    }
                }
            },
            // Paso 8: Calcular utilidad neta proyectada
            {
                $addFields: {
                    utilidadNetaEstimada: {
                        $round: [
                            {
                                $subtract: [
                                    '$totalNetoSinIVA',
                                    '$costoTotalEstimado'
                                ]
                            },
                            2
                        ]
                    },
                    porcentajeUtilidadNeta: {
                        $cond: [
                            { $gt: ['$totalNetoSinIVA', 0] },
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    { $subtract: ['$totalNetoSinIVA', '$costoTotalEstimado'] },
                                                    '$totalNetoSinIVA'
                                                ]
                                            },
                                            100
                                        ]
                                    },
                                    2
                                ]
                            },
                            0
                        ]
                    }
                }
            },
            // Paso 9: Ordenar por total vendido (descendente)
            {
                $sort: { totalVendido: -1 }
            },
            // Paso 10: Limitar resultados si se especifica
            ...(limit ? [{
                $limit: parseInt(limit as string)
            }] : [])
        ]);

        // Calcular totales generales
        const totalesGenerales = estadisticas.reduce((acc, prod) => {
            return {
                totalUnidadesVendidas: acc.totalUnidadesVendidas + prod.unidadesVendidas,
                totalMontoVendido: acc.totalMontoVendido + prod.totalVendido,
                totalUtilidadEstimada: acc.totalUtilidadEstimada + (prod.utilidadNetaEstimada || 0),
                totalDescuentos: acc.totalDescuentos + (prod.totalDescuentos || 0)
            };
        }, {
            totalUnidadesVendidas: 0,
            totalMontoVendido: 0,
            totalUtilidadEstimada: 0,
            totalDescuentos: 0
        });

        // Calcular participación de cada producto
        const estadisticasConParticipacion = estadisticas.map((prod, index) => ({
            ...prod,
            ranking: index + 1,
            participacionVentas: totalesGenerales.totalMontoVendido > 0
                ? parseFloat(((prod.totalVendido / totalesGenerales.totalMontoVendido) * 100).toFixed(2))
                : 0,
            clasificacionABC: index < estadisticas.length * 0.2 ? 'A' 
                : index < estadisticas.length * 0.5 ? 'B' 
                : 'C'
        }));

        res.json({
            productos: estadisticasConParticipacion,
            totales: {
                ...totalesGenerales,
                totalProductos: estadisticas.length,
                margenPromedioGeneral: totalesGenerales.totalMontoVendido > 0
                    ? parseFloat(((totalesGenerales.totalUtilidadEstimada / totalesGenerales.totalMontoVendido) * 100).toFixed(2))
                    : 0
            },
            filtros: {
                fechaInicio: fechaInicio || 'Desde siempre',
                fechaFin: fechaFin || 'Hasta ahora',
                categoria: categoria || 'Todas',
                limit: limit || 'Sin límite'
            }
        });
    } catch (error: any) {
        console.error('Error al obtener estadísticas de productos:', error);
        res.status(500).json({ 
            message: 'Error al obtener estadísticas de productos',
            details: error.message 
        });
    }
};
