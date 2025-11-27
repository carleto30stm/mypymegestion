import { type Request, type Response } from 'express';
import mongoose from 'mongoose';
import OrdenProcesamiento, { type IOrdenProcesamiento } from '../models/OrdenProcesamiento.js';
import MateriaPrima from '../models/MateriaPrima.js';
import MovimientoInventario from '../models/MovimientoInventario.js';
import Proveedor from '../models/Proveedor.js';
import MovimientoCuentaCorrienteProveedor from '../models/MovimientoCuentaCorrienteProveedor.js';

// Crear nueva orden
export const crearOrden = async (req: Request, res: Response) => {
    try {
        const { proveedorId, itemsSalida, tipoProcesamiento, observaciones } = req.body;
        const userId = (req as any).user._id;

        const orden = new OrdenProcesamiento({
            proveedorId,
            itemsSalida,
            tipoProcesamiento,
            observaciones,
            createdBy: userId,
            estado: 'borrador'
        });

        // Validar que el proveedor sea de mano de obra
        const proveedor = await Proveedor.findById(proveedorId);
        if (!proveedor) {
            return res.status(404).json({ message: 'Proveedor no encontrado' });
        }
        if (proveedor.tipoProveedor !== 'PROOVMANO.DE.OBRA') {
            return res.status(400).json({ message: 'El proveedor debe ser de tipo PROOVMANO.DE.OBRA' });
        }

        await orden.save();
        res.status(201).json(orden);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// Enviar orden (Salida de stock)
export const enviarOrden = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const userId = (req as any).user._id;
        const orden = await OrdenProcesamiento.findById(id).session(session);

        if (!orden) {
            throw new Error('Orden no encontrada');
        }

        if (orden.estado !== 'borrador' && orden.estado !== 'pendiente') {
            throw new Error('La orden no está en estado válido para enviar');
        }

        // Verificar stock y generar movimientos
        for (const item of orden.itemsSalida) {
            const materiaPrima = await MateriaPrima.findById(item.materiaPrimaId).session(session);
            if (!materiaPrima) throw new Error(`Materia prima ${item.nombreMateriaPrima} no encontrada`);

            if (materiaPrima.stock < item.cantidad) {
                throw new Error(`Stock insuficiente para ${item.nombreMateriaPrima}`);
            }

            // Actualizar stock
            materiaPrima.stock -= item.cantidad;
            await materiaPrima.save({ session });

            // Crear movimiento de inventario
            await MovimientoInventario.create([{
                fecha: new Date(),
                tipo: 'envio_procesamiento',
                materiaPrimaId: item.materiaPrimaId,
                codigoMateriaPrima: item.codigoMateriaPrima,
                nombreMateriaPrima: item.nombreMateriaPrima,
                cantidad: -item.cantidad, // Salida es negativa
                stockAnterior: materiaPrima.stock + item.cantidad,
                stockNuevo: materiaPrima.stock,
                unidadMedida: item.unidadMedida,
                documentoOrigen: 'ORDEN_PROCESAMIENTO',
                documentoOrigenId: orden._id,
                numeroDocumento: orden.numeroOrden,
                usuario: userId.toString(), // Ajustar según cómo guardes el usuario
                observaciones: `Envío a procesar: ${orden.numeroOrden}`
            }], { session });
        }

        orden.estado = 'en_proceso';
        orden.fechaEnvio = new Date();
        await orden.save({ session });

        await session.commitTransaction();
        res.json(orden);
    } catch (error: any) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

// Recibir orden (Entrada de stock + Costo Servicio)
export const recibirOrden = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { itemsEntrada, costoServicio, fechaRecepcion } = req.body;
        const userId = (req as any).user._id;

        const orden = await OrdenProcesamiento.findById(id).session(session);
        if (!orden) throw new Error('Orden no encontrada');

        if (orden.estado !== 'en_proceso') {
            throw new Error('La orden debe estar en proceso para ser recibida');
        }

        // 1. Procesar entrada de inventario
        for (const item of itemsEntrada) {
            const materiaPrima = await MateriaPrima.findById(item.materiaPrimaId).session(session);
            if (!materiaPrima) throw new Error(`Materia prima ${item.nombreMateriaPrima} no encontrada`);

            // Actualizar stock
            const stockAnterior = materiaPrima.stock;
            materiaPrima.stock += item.cantidad;

            // Actualizar precio promedio si hay costo asociado (opcional, aquí asumimos que el costo del servicio se distribuye o se maneja aparte)
            // Por ahora solo actualizamos stock

            await materiaPrima.save({ session });

            // Crear movimiento de inventario
            await MovimientoInventario.create([{
                fecha: fechaRecepcion || new Date(),
                tipo: 'recepcion_procesamiento',
                materiaPrimaId: item.materiaPrimaId,
                codigoMateriaPrima: item.codigoMateriaPrima,
                nombreMateriaPrima: item.nombreMateriaPrima,
                cantidad: item.cantidad,
                stockAnterior: stockAnterior,
                stockNuevo: materiaPrima.stock,
                unidadMedida: item.unidadMedida,
                documentoOrigen: 'ORDEN_PROCESAMIENTO',
                documentoOrigenId: orden._id,
                numeroDocumento: orden.numeroOrden,
                usuario: userId.toString(),
                observaciones: `Recepción de procesamiento: ${orden.numeroOrden}`
            }], { session });
        }

        // 2. Generar deuda con el proveedor (Cuenta Corriente)
        if (costoServicio > 0) {
            const proveedor = await Proveedor.findById(orden.proveedorId).session(session);
            if (!proveedor) throw new Error('Proveedor no encontrado');

            const saldoAnterior = proveedor.saldoCuenta;
            proveedor.saldoCuenta += costoServicio; // Aumenta la deuda (lo que debemos)
            await proveedor.save({ session });

            await MovimientoCuentaCorrienteProveedor.create([{
                proveedorId: orden.proveedorId,
                fecha: fechaRecepcion || new Date(),
                tipo: 'servicio_procesamiento',
                documentoTipo: 'ORDEN_PROCESAMIENTO',
                documentoNumero: orden.numeroOrden,
                documentoId: orden._id,
                concepto: `Servicio de procesamiento - Orden ${orden.numeroOrden}`,
                debe: 0,
                haber: costoServicio,
                saldo: proveedor.saldoCuenta,
                creadoPor: userId
            }], { session });
        }

        // 3. Actualizar Orden
        orden.itemsEntrada = itemsEntrada;
        orden.costoServicio = costoServicio;
        orden.fechaRecepcionReal = fechaRecepcion || new Date();
        orden.estado = 'completada';

        await orden.save({ session });

        await session.commitTransaction();
        res.json(orden);
    } catch (error: any) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

export const obtenerOrdenes = async (req: Request, res: Response) => {
    try {
        const ordenes = await OrdenProcesamiento.find()
            .populate('proveedorId', 'razonSocial')
            .sort({ fechaCreacion: -1 });
        res.json(ordenes);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const obtenerOrdenPorId = async (req: Request, res: Response) => {
    try {
        const orden = await OrdenProcesamiento.findById(req.params.id)
            .populate('proveedorId', 'razonSocial');
        if (!orden) return res.status(404).json({ message: 'Orden no encontrada' });
        res.json(orden);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Actualizar orden en borrador
export const actualizarOrden = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { proveedorId, itemsSalida, observaciones } = req.body;

        const orden = await OrdenProcesamiento.findById(id);
        if (!orden) {
            return res.status(404).json({ message: 'Orden no encontrada' });
        }

        // Solo permitir edición en borrador
        if (orden.estado !== 'borrador') {
            return res.status(400).json({ 
                message: 'Solo se pueden editar órdenes en estado borrador' 
            });
        }

        // Actualizar campos
        if (proveedorId) orden.proveedorId = proveedorId;
        if (itemsSalida) orden.itemsSalida = itemsSalida;
        if (observaciones !== undefined) orden.observaciones = observaciones;

        await orden.save();

        const ordenActualizada = await OrdenProcesamiento.findById(id)
            .populate('proveedorId', 'razonSocial');

        res.json(ordenActualizada);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
