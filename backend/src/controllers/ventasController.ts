import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import Venta from '../models/Venta.js';
import Producto from '../models/Producto.js';
import Cliente from '../models/Cliente.js';
import Gasto from '../models/Gasto.js';
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
        const { clienteId, items, medioPago, banco, detallesPago, observaciones, vendedor, iva } = req.body;

        // Validaciones básicas
        if (!clienteId || !items || items.length === 0 || !medioPago || !vendedor) {
            await session.abortTransaction();
            return res.status(400).json({ 
                message: 'Cliente, items, medio de pago y vendedor son requeridos' 
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
                productoId: producto._id,
                codigoProducto: producto.codigo,
                nombreProducto: producto.nombre,
                cantidad: item.cantidad,
                precioUnitario,
                subtotal,
                descuento,
                total
            });

            subtotalVenta += subtotal;

            // Descontar stock
            producto.stock -= item.cantidad;
            await producto.save({ session });
        }

        // Calcular totales
        const descuentoTotal = itemsVenta.reduce((sum, item) => sum + item.descuento, 0);
        const ivaCalculado = iva || 0;
        const totalVenta = subtotalVenta - descuentoTotal + ivaCalculado;

        // Determinar estado inicial
        let estadoVenta = 'confirmada';
        if (medioPago === 'Cuenta Corriente') {
            estadoVenta = 'parcial';
            
            // Actualizar saldo del cliente
            cliente.saldoCuenta += totalVenta;
            cliente.ultimaCompra = new Date();
            
            // Verificar límite de crédito
            if (cliente.saldoCuenta > cliente.limiteCredito) {
                cliente.estado = 'moroso';
            }
            
            await cliente.save({ session });
        }

        // Crear venta
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
            medioPago,
            banco,
            detallesPago,
            observaciones,
            vendedor,
            estado: estadoVenta
        });

        const ventaGuardada = await nuevaVenta.save({ session });

        // Crear registro en Gasto solo si NO es cuenta corriente (pendiente de cobro)
        if (medioPago !== 'Cuenta Corriente') {
            // Determinar subRubro según medio de pago
            let subRubro = 'COBRO';
            if (medioPago === 'EFECTIVO') subRubro = 'COBRO';
            else if (medioPago === 'TRANSFERENCIA') subRubro = 'COBRO';
            else if (medioPago === 'TARJETA DÉBITO' || medioPago === 'TARJETA CRÉDITO') subRubro = 'COBRO';
            else if (medioPago === 'CHEQUE TERCERO') subRubro = 'COBRO';

            // Para cheques de terceros, no confirmar automáticamente (queda pendiente)
            const esChequeTercero = medioPago === 'CHEQUE TERCERO';

            const nuevoGasto = new Gasto({
                fecha: nuevaVenta.fecha,
                rubro: 'COBRO.VENTA',
                subRubro,
                medioDePago: medioPago,
                banco: banco || 'EFECTIVO',
                entrada: totalVenta,
                salida: 0,
                detalleGastos: `Venta ${ventaGuardada.numeroVenta} - Cliente: ${nombreCliente}`,
                tipoOperacion: 'entrada',
                confirmado: !esChequeTercero, // Cheques de terceros quedan sin confirmar
                estadoCheque: esChequeTercero ? 'recibido' : undefined,
                fechaStandBy: esChequeTercero ? nuevaVenta.fecha : null
            });

            const gastoGuardado = await nuevoGasto.save({ session });

            // Vincular gasto con venta
            ventaGuardada.gastoRelacionadoId = gastoGuardado._id;
            await ventaGuardada.save({ session });
        }

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

// @desc    Anular una venta
// @route   PATCH /api/ventas/:id/anular
// @access  Private (admin)
export const anularVenta = async (req: ExpressRequest, res: ExpressResponse) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { motivoAnulacion } = req.body;

        if (!motivoAnulacion) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'El motivo de anulación es requerido' });
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
