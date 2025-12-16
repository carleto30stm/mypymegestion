import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import mongoose from 'mongoose';
import ReciboPago from '../models/ReciboPago.js';
import Venta from '../models/Venta.js';
import Gasto from '../models/Gasto.js';
import Cliente from '../models/Cliente.js';
import MovimientoCuentaCorriente from '../models/MovimientoCuentaCorriente.js';
import Factura from '../models/Factura.js'; // Para facturación automática (Fase 2)
import { MOTIVOS_CORRECCION } from '../Types/Types.js';

// @desc    Obtener todos los recibos con filtros
// @route   GET /api/recibos
// @access  Private
export const getRecibos = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const {
      clienteId,
      estadoRecibo,
      momentoCobro,
      fechaInicio,
      fechaFin,
      medioPago
    } = req.query;

    // Construir filtros
    const filtros: any = {};

    if (clienteId) {
      filtros.clienteId = clienteId;
    }

    if (estadoRecibo) {
      filtros.estadoRecibo = estadoRecibo;
    }

    if (momentoCobro) {
      filtros.momentoCobro = momentoCobro;
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

    if (medioPago) {
      filtros['formasPago.medioPago'] = medioPago;
    }

    const recibos = await ReciboPago.find(filtros)
      .populate('clienteId', 'nombre apellido numeroDocumento razonSocial')
      .populate('creadoPor', 'username')
      .sort({ fecha: -1 });

    res.json(recibos);
  } catch (error) {
    console.error('Error al obtener recibos:', error);
    res.status(500).json({ message: 'Error al obtener recibos' });
  }
};

// @desc    Obtener recibo por ID
// @route   GET /api/recibos/:id
// @access  Private
export const getReciboById = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const recibo = await ReciboPago.findById(req.params.id)
      .populate('clienteId')
      .populate('ventasRelacionadas.ventaId')
      .populate('creadoPor', 'username')
      .populate('modificadoPor', 'username');

    if (!recibo) {
      return res.status(404).json({ message: 'Recibo no encontrado' });
    }

    res.json(recibo);
  } catch (error) {
    console.error('Error al obtener recibo:', error);
    res.status(500).json({ message: 'Error al obtener recibo' });
  }
};

// @desc    Crear nuevo recibo de pago
// @route   POST /api/recibos
// @access  Private (admin/oper_ad/oper)
export const crearRecibo = async (req: ExpressRequest, res: ExpressResponse) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      clienteId,
      ventasIds,
      formasPago,
      momentoCobro,
      observaciones,
      creadoPor
    } = req.body;

    // Validaciones básicas
    if (!clienteId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cliente es obligatorio' });
    }

    if (!formasPago || !Array.isArray(formasPago) || formasPago.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Debe especificar al menos una forma de pago' });
    }

    // Validar montos en las formas de pago (no se permiten montos <= 0)
    for (const fp of formasPago) {
      if (typeof fp.monto !== 'number' || fp.monto <= 0) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Todas las formas de pago deben tener un monto mayor a cero' });
      }
    }

    if (!creadoPor) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'El creador es obligatorio' });
    }

    // Verificar si es un pago de regularización (sin ventas específicas) o cobro de ventas
    const esRegularizacion = !ventasIds || !Array.isArray(ventasIds) || ventasIds.length === 0;

    let ventas: any[] = [];
    let ventasRelacionadas: any[] = [];
    let totalACobrar = 0;

    if (!esRegularizacion) {
      // Es un cobro de ventas específicas
      ventas = await Venta.find({ _id: { $in: ventasIds } }).session(session);

      if (ventas.length !== ventasIds.length) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Una o más ventas no fueron encontradas' });
      }

      // Validar que todas las ventas pertenezcan al mismo cliente
      const clientesUnicos = [...new Set(ventas.map((v: any) => v.clienteId.toString()))];
      if (clientesUnicos.length > 1) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Todas las ventas deben pertenecer al mismo cliente' });
      }

      if (clientesUnicos[0] !== clienteId) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Las ventas no pertenecen al cliente especificado' });
      }
    }

    // Calcular totales
    const totalFormasPago = formasPago.reduce((sum: number, fp: any) => sum + fp.monto, 0);

    if (!esRegularizacion) {
      // Solo validar y distribuir si hay ventas específicas
      for (const venta of ventas) {
        const saldoAnterior = venta.saldoPendiente;

        if (saldoAnterior <= 0) {
          await session.abortTransaction();
          return res.status(400).json({
            message: `La venta ${venta.numeroVenta} no tiene saldo pendiente`
          });
        }

        totalACobrar += saldoAnterior;

        ventasRelacionadas.push({
          ventaId: venta._id as mongoose.Types.ObjectId,
          numeroVenta: venta.numeroVenta || (venta._id as mongoose.Types.ObjectId).toString(),
          montoOriginal: venta.total,
          saldoAnterior: saldoAnterior,
          montoCobrado: 0, // Se calculará después
          saldoRestante: 0  // Se calculará después
        });
      }

      // Distribuir el pago entre las ventas
      let montoPendienteDistribuir = totalFormasPago;

      for (let i = 0; i < ventasRelacionadas.length; i++) {
        const ventaRel = ventasRelacionadas[i];
        const venta = ventas[i];

        if (!ventaRel || !venta) continue;
        if (montoPendienteDistribuir <= 0) break;

        const montoCobrado = Math.min(ventaRel.saldoAnterior, montoPendienteDistribuir);
        ventaRel.montoCobrado = montoCobrado;
        ventaRel.saldoRestante = ventaRel.saldoAnterior - montoCobrado;

        montoPendienteDistribuir -= montoCobrado;

        // Actualizar venta
        // Evitar sobrepago accidental: cap al total de la venta
        const nuevoMontoCobrado = Math.min(venta.montoCobrado + montoCobrado, venta.total);
        venta.montoCobrado = nuevoMontoCobrado;
        venta.saldoPendiente = ventaRel.saldoRestante;

        // Actualizar estado de cobranza y estadoGranular
        if (venta.saldoPendiente === 0) {
          venta.estadoCobranza = 'cobrado';
          // Actualizar estadoGranular a 'cobrada' si la venta está confirmada
          if (venta.estado === 'confirmada' || venta.estadoGranular === 'confirmada') {
            venta.estadoGranular = 'cobrada';
          }
        } else if (venta.montoCobrado > 0) {
          venta.estadoCobranza = 'parcialmente_cobrado';
        }

        await venta.save({ session });
      }
    }

    // Obtener datos del cliente
    const cliente = await Cliente.findById(clienteId).session(session);
    if (!cliente) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const nombreCliente = cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre}`.trim();
    const documentoCliente = cliente.numeroDocumento;

    // Calcular totales correctos para el recibo
    // totalACobrar: para regularizaciones = totalFormasPago, para cobros de ventas = suma de montoCobrado en ventasRelacionadas
    const totalCobradoEnVentas = ventasRelacionadas.reduce((sum, vr) => sum + (vr.montoCobrado || 0), 0);
    const totalACobrarFinal = esRegularizacion ? totalFormasPago : totalCobradoEnVentas;
    const vueltoFinal = esRegularizacion ? 0 : (totalFormasPago > totalACobrarFinal ? totalFormasPago - totalACobrarFinal : 0);
    const saldoPendienteFinal = esRegularizacion ? 0 : (totalFormasPago < totalACobrarFinal ? totalACobrarFinal - totalFormasPago : 0);

    // Crear el recibo
    const nuevoRecibo = new ReciboPago({
      fecha: new Date(),
      clienteId,
      nombreCliente,
      documentoCliente,
      ventasRelacionadas,
      formasPago,
      totales: {
        totalACobrar: totalACobrarFinal,
        totalCobrado: totalFormasPago,
        vuelto: vueltoFinal,
        saldoPendiente: saldoPendienteFinal
      },
      momentoCobro: momentoCobro || 'diferido', // Siempre 'diferido' si no se especifica
      estadoRecibo: 'activo',
      observaciones: observaciones || (esRegularizacion ? 'Regularización de deuda - Pago directo' : ''),
      creadoPor
    });

    const reciboGuardado = await nuevoRecibo.save({ session });

    // IMPORTANTE: Solo registrar movimiento en cuenta corriente si hay cobros REALES
    // Si todas las formas de pago son CUENTA_CORRIENTE, NO hay cobro físico (solo ajuste de estado)
    // El MovimientoCuentaCorriente con debe ya se creó al confirmar la venta
    const formasPagoReales = formasPago.filter(fp => fp.medioPago !== 'CUENTA_CORRIENTE');
    const totalCobradoReal = formasPagoReales.reduce((sum, fp) => sum + fp.monto, 0);

    // Solo si hay cobros reales (efectivo, cheque, transferencia), registrar en cuenta corriente
    if (totalCobradoReal > 0) {
      const ultimoMovimiento = await MovimientoCuentaCorriente.findOne({
        clienteId,
        anulado: false
      }).sort({ fecha: -1, createdAt: -1 }).session(session);

      const saldoAnterior = ultimoMovimiento?.saldo || 0;
      const nuevoSaldo = saldoAnterior - totalCobradoReal; // Cobro reduce la deuda

      await MovimientoCuentaCorriente.create([{
        clienteId,
        fecha: new Date(),
        tipo: 'recibo',
        documentoTipo: 'RECIBO',
        documentoNumero: reciboGuardado.numeroRecibo || 'PENDIENTE',
        documentoId: reciboGuardado._id,
        concepto: `Recibo #${reciboGuardado.numeroRecibo || 'PENDIENTE'} - ${ventasRelacionadas.length} ventas cobradas`,
        debe: 0,
        haber: totalCobradoReal,
        saldo: nuevoSaldo,
        creadoPor,
        anulado: false
      }], { session });

      // Actualizar saldo del cliente
      await Cliente.findByIdAndUpdate(
        clienteId,
        { saldoCuenta: nuevoSaldo },
        { session }
      );
    }

    // Registrar cada forma de pago como un Gasto de tipo entrada (ingreso)
    // IMPORTANTE: NO registrar Gasto si es CUENTA_CORRIENTE (no hay ingreso físico de dinero)
    for (const formaPago of formasPago) {
      // Si es cuenta corriente, solo se registra en MovimientoCuentaCorriente (ya hecho arriba)
      // NO crear Gasto porque el dinero no ingresó a caja
      if (formaPago.medioPago === 'CUENTA_CORRIENTE') {
        continue; // Saltar este medio de pago
      }

      // Determinar el banco/caja según el medio de pago
      let bancoDestino = 'EFECTIVO'; // Por defecto efectivo

      if (formaPago.medioPago === 'TRANSFERENCIA' || formaPago.medioPago === 'CHEQUE') {
        // Si tiene banco especificado, usar ese banco
        bancoDestino = formaPago.banco || 'PROVINCIA';
      } else if (formaPago.medioPago === 'EFECTIVO') {
        bancoDestino = 'EFECTIVO';
      } else if (formaPago.medioPago === 'TARJETA_DEBITO' || formaPago.medioPago === 'TARJETA_CREDITO') {
        // Las tarjetas van al banco especificado o SANTANDER por defecto
        bancoDestino = formaPago.banco || 'SANTANDER';
      }

      // Mapear medioPago de ReciboPago al enum MEDIO_PAGO de Gasto
      // ReciboPago usa: 'CHEQUE', 'TARJETA_DEBITO', 'TARJETA_CREDITO'
      // Gasto usa: 'CHEQUE TERCERO', 'TARJETA DÉBITO', 'TARJETA CRÉDITO'
      let medioPagoGasto = formaPago.medioPago;
      if (formaPago.medioPago === 'CHEQUE') {
        // Por defecto asumir CHEQUE TERCERO (el cliente paga con cheque)
        medioPagoGasto = 'CHEQUE TERCERO';
      } else if (formaPago.medioPago === 'TARJETA_DEBITO') {
        medioPagoGasto = 'TARJETA DÉBITO';
      } else if (formaPago.medioPago === 'TARJETA_CREDITO') {
        medioPagoGasto = 'TARJETA CRÉDITO';
      }

      // Crear un Gasto de tipo entrada (ingreso) en la tabla de gastos
      // Vincular con el recibo para bloquear edición directa
      await Gasto.create([{
        fecha: new Date(),
        rubro: 'COBRO.VENTA',
        subRubro: 'COBRO',
        medioDePago: medioPagoGasto,
        numeroCheque: formaPago.medioPago === 'CHEQUE' && formaPago.datosCheque ? formaPago.datosCheque.numeroCheque : undefined,
        clientes: nombreCliente,
        detalleGastos: `Cobranza recibo ${reciboGuardado.numeroRecibo || 'PENDIENTE'} - ${nombreCliente}${formaPago.observaciones ? ` - ${formaPago.observaciones}` : ''}`,
        tipoOperacion: 'entrada',
        comentario: observaciones || `Recibo ${reciboGuardado.numeroRecibo || 'PENDIENTE'}`,
        estado: 'activo',
        confirmado: true,
        entrada: formaPago.monto,
        salida: 0,
        banco: bancoDestino,
        reciboRelacionadoId: reciboGuardado._id // Vincular con recibo para bloquear edición
      }], { session })
    }

    // Actualizar referencias en ventas (solo si no es regularización)
    if (!esRegularizacion) {
      for (const venta of ventas) {
        if (!venta.recibosRelacionados) {
          venta.recibosRelacionados = [];
        }
        venta.recibosRelacionados.push(reciboGuardado._id as mongoose.Types.ObjectId);
        venta.ultimaCobranza = new Date();
        await venta.save({ session });
      }
    }

    // 🆕 FASE 2: Facturación automática al cobrar
    // Si el cliente tiene facturacionAutomatica=true Y requiereFacturaAFIP=true
    // Intentar generar facturas automáticamente para ventas sin facturar
    if (cliente.facturacionAutomatica && cliente.requiereFacturaAFIP && !esRegularizacion) {
      const ventasSinFacturar = ventas.filter(v => !v.facturada && !v.facturaId);

      if (ventasSinFacturar.length > 0) {
        console.log(`[Facturación Automática] Cliente ${nombreCliente} tiene ${ventasSinFacturar.length} ventas sin facturar`);

        for (const venta of ventasSinFacturar) {
          try {
            // Crear factura en borrador automáticamente
            const facturaAutomatica = new Factura({
              ventaId: venta._id,
              clienteId: venta.clienteId,
              fecha: new Date(),
              items: venta.items,
              subtotal: venta.subtotal,
              iva: venta.iva,
              total: venta.total,
              estado: 'borrador', // Crear en borrador, requiere autorización manual AFIP
              usuarioCreador: creadoPor,
              observaciones: `Factura generada automáticamente al cobrar recibo ${reciboGuardado.numeroRecibo || 'PENDIENTE'}`
            });

            const facturaGuardada = await facturaAutomatica.save({ session });

            // Asociar factura a la venta
            venta.facturaId = facturaGuardada._id as mongoose.Types.ObjectId;
            venta.facturada = true; // Marcar como facturada (aunque esté en borrador)
            await venta.save({ session });

            console.log(`[Facturación Automática] ✅ Factura ${facturaGuardada._id} creada para venta ${venta.numeroVenta}`);
          } catch (facturaError: any) {
            // NO fallar todo el recibo si falla la facturación automática
            // Solo registrar el error y continuar
            console.error(`[Facturación Automática] ❌ Error al crear factura para venta ${venta.numeroVenta}:`, facturaError.message);
            // La factura quedará pendiente de creación manual
          }
        }
      }
    }

    await session.commitTransaction();

    const reciboCompleto = await ReciboPago.findById(reciboGuardado._id)
      .populate('clienteId')
      .populate('ventasRelacionadas.ventaId')
      .populate('creadoPor', 'username');

    res.status(201).json(reciboCompleto);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al crear recibo:', error);
    res.status(500).json({
      message: 'Error al crear recibo',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// @desc    Anular recibo de pago
// @route   PATCH /api/recibos/:id/anular
// @access  Private (admin only)
export const anularRecibo = async (req: ExpressRequest, res: ExpressResponse) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { motivoAnulacion, modificadoPor } = req.body;

    if (!motivoAnulacion) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'El motivo de anulación es obligatorio' });
    }

    const recibo = await ReciboPago.findById(req.params.id).session(session);

    if (!recibo) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Recibo no encontrado' });
    }

    if (recibo.estadoRecibo === 'anulado') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'El recibo ya está anulado' });
    }

    // Revertir los pagos en las ventas relacionadas
    for (const ventaRel of recibo.ventasRelacionadas) {
      const venta = await Venta.findById(ventaRel.ventaId).session(session);

      if (venta) {
        // Revertir monto cobrado
        venta.montoCobrado -= ventaRel.montoCobrado;
        venta.saldoPendiente += ventaRel.montoCobrado;

        // Actualizar estado de cobranza
        if (venta.montoCobrado === 0) {
          venta.estadoCobranza = 'sin_cobrar';
        } else if (venta.saldoPendiente > 0) {
          venta.estadoCobranza = 'parcialmente_cobrado';
        }

        // Remover referencia al recibo
        if (venta.recibosRelacionados) {
          const reciboIdStr = (recibo._id as mongoose.Types.ObjectId).toString();
          venta.recibosRelacionados = venta.recibosRelacionados.filter(
            (r: any) => r.toString() !== reciboIdStr
          );
        }

        await venta.save({ session });
      }
    }

    // Anular el recibo
    recibo.estadoRecibo = 'anulado';
    recibo.motivoAnulacion = motivoAnulacion;
    recibo.fechaAnulacion = new Date();
    recibo.modificadoPor = modificadoPor;

    await recibo.save({ session });

    await session.commitTransaction();

    const reciboActualizado = await ReciboPago.findById(recibo._id)
      .populate('clienteId')
      .populate('ventasRelacionadas.ventaId');

    res.json(reciboActualizado);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al anular recibo:', error);
    res.status(500).json({
      message: 'Error al anular recibo',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// @desc    Obtener estadísticas de cobranza
// @route   GET /api/recibos/estadisticas
// @access  Private
export const getEstadisticasCobranza = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    // Total de recibos activos
    const totalRecibos = await ReciboPago.countDocuments({ estadoRecibo: 'activo' });

    // Monto total cobrado
    const montoCobrado = await ReciboPago.aggregate([
      { $match: { estadoRecibo: 'activo' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$totales.totalCobrado' }
        }
      }
    ]);

    const montoTotalCobrado = montoCobrado.length > 0 ? montoCobrado[0].total : 0;

    // Recibos por medio de pago
    const recibosPorMedioPago = await ReciboPago.aggregate([
      { $match: { estadoRecibo: 'activo' } },
      { $unwind: '$formasPago' },
      {
        $group: {
          _id: '$formasPago.medioPago',
          cantidad: { $sum: 1 },
          monto: { $sum: '$formasPago.monto' }
        }
      },
      { $sort: { monto: -1 } }
    ]);

    // Ventas pendientes de cobro
    const ventasPendientes = await Venta.aggregate([
      {
        $match: {
          estado: 'confirmada',
          estadoCobranza: { $in: ['sin_cobrar', 'parcialmente_cobrado'] },
          saldoPendiente: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          cantidad: { $sum: 1 },
          montoTotal: { $sum: '$saldoPendiente' }
        }
      }
    ]);

    // Cheques pendientes de cobro
    const chequesPendientes = await ReciboPago.aggregate([
      { $match: { estadoRecibo: 'activo' } },
      { $unwind: '$formasPago' },
      {
        $match: {
          'formasPago.medioPago': 'CHEQUE',
          'formasPago.datosCheque.estadoCheque': { $in: ['pendiente', 'en_cartera'] }
        }
      },
      {
        $group: {
          _id: null,
          cantidad: { $sum: 1 },
          montoTotal: { $sum: '$formasPago.monto' }
        }
      }
    ]);

    res.json({
      totalRecibos,
      montoTotalCobrado,
      recibosPorMedioPago,
      ventasPendientesCobro: {
        cantidad: ventasPendientes.length > 0 ? ventasPendientes[0].cantidad : 0,
        montoTotal: ventasPendientes.length > 0 ? ventasPendientes[0].montoTotal : 0
      },
      chequesPendientes: {
        cantidad: chequesPendientes.length > 0 ? chequesPendientes[0].cantidad : 0,
        montoTotal: chequesPendientes.length > 0 ? chequesPendientes[0].montoTotal : 0
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas de cobranza' });
  }
};

// @desc    Obtener recibos por cliente
// @route   GET /api/recibos/cliente/:clienteId
// @access  Private
export const getRecibosPorCliente = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { clienteId } = req.params;

    const recibos = await ReciboPago.find({
      clienteId,
      estadoRecibo: 'activo'
    })
      .populate('ventasRelacionadas.ventaId', 'numeroVenta fecha')
      .populate('creadoPor', 'username')
      .sort({ fecha: -1 });

    res.json(recibos);
  } catch (error) {
    console.error('Error al obtener recibos por cliente:', error);
    res.status(500).json({ message: 'Error al obtener recibos del cliente' });
  }
};

// @desc    Corregir monto de un recibo (sin AFIP - solo registro interno)
// @route   PATCH /api/recibos/:id/corregir-monto
// @access  Private (admin/oper_ad)
export const corregirMonto = async (req: ExpressRequest, res: ExpressResponse) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const {
      montoOriginal,
      montoCorrecto,
      motivo,
      observaciones,
      banco
    } = req.body;

    const username = req.user?.username;
    const userType = req.user?.userType;

    // Validar permisos
    if (userType !== 'admin' && userType !== 'oper_ad') {
      await session.abortTransaction();
      return res.status(403).json({ message: 'No tiene permisos para corregir montos' });
    }

    // Validaciones básicas
    if (typeof montoOriginal !== 'number' || typeof montoCorrecto !== 'number') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Monto original y monto correcto son obligatorios' });
    }

    if (montoCorrecto <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'El monto correcto debe ser mayor a cero' });
    }

    if (montoOriginal === montoCorrecto) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'No hay diferencia para corregir' });
    }

    if (!motivo) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'El motivo es obligatorio' });
    }

    // Validar motivo
    if (!MOTIVOS_CORRECCION.includes(motivo)) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Motivo inválido. Motivos válidos: ${MOTIVOS_CORRECCION.join(', ')}`
      });
    }

    // Obtener recibo
    const recibo = await ReciboPago.findById(id).session(session);
    if (!recibo) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Recibo no encontrado' });
    }

    if (recibo.estadoRecibo === 'anulado') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'No se puede corregir un recibo anulado' });
    }

    // Obtener cliente
    const cliente = await Cliente.findById(recibo.clienteId).session(session);
    if (!cliente) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const nombreCliente = cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre}`.trim();
    const diferencia = montoCorrecto - montoOriginal;
    const esDevolucion = diferencia < 0;
    const montoAjuste = Math.abs(diferencia);
    const bancoDestino = banco || 'EFECTIVO';

    // Crear gasto compensatorio
    const gastoCorreccion = await Gasto.create([{
      fecha: new Date(),
      rubro: esDevolucion ? 'DEVOLUCION' : 'COBRO.VENTA',
      subRubro: esDevolucion ? 'DEVOLUCION A CLIENTE' : 'AJUSTE',
      medioDePago: 'EFECTIVO',
      clientes: nombreCliente,
      detalleGastos: `Corrección - Recibo ${recibo.numeroRecibo || id} - ${esDevolucion ? 'Devolución' : 'Cobro'} $${montoAjuste.toFixed(2)} - ${motivo}`,
      tipoOperacion: esDevolucion ? 'salida' : 'entrada',
      comentario: `${observaciones || ''} (Corrección: $${montoOriginal} → $${montoCorrecto})`,
      estado: 'activo',
      confirmado: true,
      entrada: esDevolucion ? 0 : montoAjuste,
      salida: esDevolucion ? montoAjuste : 0,
      banco: bancoDestino,
      creadoPor: username
    }], { session });

    // Actualizar cuenta corriente
    const ultimoMov = await MovimientoCuentaCorriente.findOne({
      clienteId: recibo.clienteId,
      anulado: false
    }).sort({ fecha: -1, createdAt: -1 }).session(session);

    const saldoAnterior = ultimoMov?.saldo || 0;
    const nuevoSaldo = saldoAnterior + (esDevolucion ? montoAjuste : -montoAjuste);

    await MovimientoCuentaCorriente.create([{
      clienteId: recibo.clienteId,
      fecha: new Date(),
      tipo: esDevolucion ? 'nota_credito' : 'ajuste_descuento',
      documentoTipo: 'CORRECCION',
      documentoNumero: `CORR-${recibo.numeroRecibo || id}`,
      documentoId: gastoCorreccion[0]?._id,
      concepto: `Corrección monto - Recibo ${recibo.numeroRecibo || 'PENDIENTE'} - ${motivo}`,
      debe: esDevolucion ? montoAjuste : 0,
      haber: esDevolucion ? 0 : montoAjuste,
      saldo: nuevoSaldo,
      creadoPor: username,
      anulado: false
    }], { session });

    await Cliente.findByIdAndUpdate(
      recibo.clienteId,
      { saldoCuenta: nuevoSaldo },
      { session }
    );

    await session.commitTransaction();

    res.json({
      message: `Corrección aplicada. ${esDevolucion ? 'Devolución' : 'Cobro adicional'} de $${montoAjuste.toFixed(2)}`,
      correccion: {
        reciboId: recibo._id,
        numeroRecibo: recibo.numeroRecibo,
        montoOriginal,
        montoCorrecto,
        diferencia,
        tipo: esDevolucion ? 'devolucion' : 'cobro_adicional',
        gastoId: gastoCorreccion[0]?._id,
        nuevoSaldoCliente: nuevoSaldo
      }
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al corregir monto:', error);
    res.status(500).json({ message: 'Error al corregir monto', error: error.message });
  } finally {
    session.endSession();
  }
};
