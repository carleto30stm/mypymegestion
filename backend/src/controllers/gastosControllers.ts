// Fix: Aliased Request and Response to avoid global type conflicts.
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import Gasto from '../models/Gasto.js';

// @desc    Obtener gastos con filtros opcionales
// @route   GET /api/gastos?desde=2024-01-01&hasta=2024-12-31&limite=100
// @access  Private
// Fix: Use the standard Express Request type. The 'user' property is added via declaration merging.
export const getGastos = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const { desde, hasta, limite } = req.query;

        // Construir query de filtrado
        let query: any = {};

        // Si hay rango de fechas, filtrar
        if (desde || hasta) {
            query.fecha = {};
            if (desde) {
                // Inicio del día (00:00:00)
                const fechaDesde = new Date(desde as string);
                fechaDesde.setHours(0, 0, 0, 0);
                query.fecha.$gte = fechaDesde;
            }
            if (hasta) {
                // Final del día (23:59:59.999)
                const fechaHasta = new Date(hasta as string);
                fechaHasta.setHours(23, 59, 59, 999);
                query.fecha.$lte = fechaHasta;
            }
        }
        // Si no hay filtros de fecha, traer TODOS los registros (para filtro "Total")

        // Aplicar límite si se especifica (por defecto sin límite para mantener compatibilidad)
        let queryBuilder = Gasto.find(query).sort({ fecha: -1 });

        if (limite) {
            queryBuilder = queryBuilder.limit(Number(limite));
        }

        const gastos = await queryBuilder;

        // Opcional: incluir metadata para debugging
        const metadata = {
            count: gastos.length,
            filtros: {
                desde: desde || 'últimos 3 meses',
                hasta: hasta || 'hoy',
                limite: limite || 'sin límite'
            }
        };

        res.json(gastos);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Crear un nuevo gasto
// @route   POST /api/gastos
// @access  Private
// Fix: Use the standard Express Request type. The 'user' property is added via declaration merging.
export const createGasto = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        // Agregar el usuario que crea el gasto desde la sesión
        // Si no se envía `fecha`, asignar la fecha actual (today)
        const fechaParsed = req.body?.fecha ? new Date(req.body.fecha as string) : new Date();
        const datosGasto = {
            ...req.body,
            fecha: fechaParsed,
            creadoPor: req.user?.username // Guardar username en lugar de id
        };

        const nuevoGasto = new Gasto(datosGasto);
        const gastoGuardado = await nuevoGasto.save();
        res.status(201).json(gastoGuardado);
    } catch (error: any) {
        res.status(400).json({ message: 'Datos inválidos', details: error.message });
    }
};

// @desc    Actualizar un gasto
// @route   PUT /api/gastos/:id
// @access  Private
// Fix: Use the standard Express Request type. The 'user' property is added via declaration merging.
export const updateGasto = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const gasto = await Gasto.findById(req.params.id);

        if (!gasto) {
            return res.status(404).json({ message: 'Gasto no encontrado' });
        }

        // Bloquear edición de gastos vinculados a recibos
        if (gasto.reciboRelacionadoId) {
            return res.status(403).json({
                message: 'Este gasto está vinculado a un recibo de pago. Use "Corregir Monto" desde la página de Cobranzas.',
                reciboId: gasto.reciboRelacionadoId,
                bloqueado: true
            });
        }

        const gastoActualizado = await Gasto.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(gastoActualizado);
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// @desc    Eliminar un gasto
// @route   DELETE /api/gastos/:id
// @access  Private
// Fix: Use the standard Express Request type. The 'user' property is added via declaration merging.
export const deleteGasto = async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        const gasto = await Gasto.findById(req.params.id);

        if (!gasto) {
            return res.status(404).json({ message: 'Gasto no encontrado' });
        }

        // Si es un adelanto, revertir el monto en la liquidación
        if (gasto.concepto === 'adelanto') {
            const { default: LiquidacionPeriodo } = await import('../models/LiquidacionPeriodo.js');

            // Buscar el periodo que contiene este gasto en gastosRelacionados
            const periodo = await LiquidacionPeriodo.findOne({
                'liquidaciones.gastosRelacionados': gasto._id
            });

            if (periodo) {
                // Verificar que el periodo no esté cerrado
                if (periodo.estado === 'cerrado') {
                    return res.status(400).json({
                        message: 'No se puede eliminar un adelanto de un período cerrado'
                    });
                }

                // Encontrar la liquidación específica que contiene este gasto
                const liquidacion = periodo.liquidaciones.find((liq: any) =>
                    liq.gastosRelacionados.some((id: any) =>
                        id.toString() === gasto._id.toString()
                    )
                );

                if (liquidacion) {
                    // Revertir el adelanto
                    liquidacion.adelantos -= gasto.salida;

                    // Remover el gasto de gastosRelacionados
                    liquidacion.gastosRelacionados = liquidacion.gastosRelacionados.filter(
                        (id: any) => id.toString() !== gasto._id.toString()
                    );

                    // Recalcular totalAPagar
                    liquidacion.totalAPagar =
                        liquidacion.sueldoBase +
                        liquidacion.totalHorasExtra +
                        liquidacion.aguinaldos +
                        liquidacion.incentivos -
                        liquidacion.adelantos -
                        liquidacion.descuentos;

                    // Guardar el periodo actualizado
                    await periodo.save();

                    console.log(`✅ Adelanto revertido: $${gasto.salida} restado de ${liquidacion.empleadoApellido}, ${liquidacion.empleadoNombre}`);
                }
            }
        }

        // Eliminar el gasto
        await Gasto.findByIdAndDelete(req.params.id);

        res.json({
            message: 'Gasto eliminado correctamente',
            adelantoRevertido: gasto.concepto === 'adelanto'
        });

    } catch (error) {
        console.error('Error al eliminar gasto:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
