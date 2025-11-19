import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import MovimientoCuentaCorriente from '../models/MovimientoCuentaCorriente.js';
import Cliente from '../models/Cliente.js';
import InteresPunitorio from '../models/InteresPunitorio.js';
import mongoose from 'mongoose';
import { PDFGenerator } from '../utils/pdfGenerator.js';

// @desc    Obtener movimientos de cuenta corriente de un cliente
// @route   GET /api/cuenta-corriente/:clienteId/movimientos
// @access  Private
export const getMovimientos = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { clienteId } = req.params;
    const { desde, hasta, tipo, incluirAnulados = 'false' } = req.query;

    // Validar que el cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Construir filtros
    const filtros: any = { clienteId: new mongoose.Types.ObjectId(clienteId) };

    if (incluirAnulados === 'false') {
      filtros.anulado = false;
    }

    if (tipo) {
      filtros.tipo = tipo;
    }

    if (desde || hasta) {
      filtros.fecha = {};
      if (desde) filtros.fecha.$gte = new Date(desde as string);
      if (hasta) filtros.fecha.$lte = new Date(hasta as string);
    }

    // Obtener movimientos
    const movimientos = await MovimientoCuentaCorriente.find(filtros)
      .sort({ fecha: -1, createdAt: -1 })
      .populate('creadoPor', 'username')
      .lean();

    res.json({
      success: true,
      count: movimientos.length,
      data: movimientos
    });
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Error al obtener movimientos', 
      details: error.message 
    });
  }
};

// @desc    Obtener resumen de cuenta corriente
// @route   GET /api/cuenta-corriente/:clienteId/resumen
// @access  Private
export const getResumen = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { clienteId } = req.params;
const { desde, hasta } = req.query;

    // Validar cliente
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Construir filtros opcionales (desde, hasta) para calcular el resumen en contexto
    const filtros: any = { clienteId: new mongoose.Types.ObjectId(clienteId), anulado: false };
    if (desde || hasta) {
      filtros.fecha = {};
      if (desde) filtros.fecha.$gte = new Date(desde as string);
      if (hasta) filtros.fecha.$lte = new Date(hasta as string);
    }

    // Último movimiento para obtener saldo actual dentro del rango (si aplica)
    const ultimoMovimiento = await MovimientoCuentaCorriente.findOne(filtros).sort({ fecha: -1, createdAt: -1 });

    const saldoActual = ultimoMovimiento?.saldo || 0;

    // Calcular totales (en rango si se pasaron filtros)
    const matchTotales: any = { clienteId: new mongoose.Types.ObjectId(clienteId), anulado: false };
    if (desde || hasta) {
      matchTotales.fecha = {};
      if (desde) matchTotales.fecha.$gte = new Date(desde as string);
      if (hasta) matchTotales.fecha.$lte = new Date(hasta as string);
    }

    const totales = await MovimientoCuentaCorriente.aggregate([
      {
        $match: matchTotales
      },
      {
        $group: {
          _id: null,
          totalDebe: { $sum: '$debe' },
          totalHaber: { $sum: '$haber' }
        }
      }
    ]);

    const { totalDebe = 0, totalHaber = 0 } = totales[0] || {};

    // Contar movimientos por tipo (en rango si aplica)
    const matchPorTipo: any = { clienteId: new mongoose.Types.ObjectId(clienteId), anulado: false };
    if (desde || hasta) {
      matchPorTipo.fecha = {};
      if (desde) matchPorTipo.fecha.$gte = new Date(desde as string);
      if (hasta) matchPorTipo.fecha.$lte = new Date(hasta as string);
    }

    const movimientosPorTipo = await MovimientoCuentaCorriente.aggregate([
      {
        $match: matchPorTipo
      },
      {
        $group: {
          _id: '$tipo',
          cantidad: { $sum: 1 },
          monto: { $sum: { $subtract: ['$debe', '$haber'] } }
        }
      }
    ]);

    // Saldo disponible = límite - saldo actual (dentro de rango si corresponde)
    // Si saldo es negativo (cliente tiene a favor), suma al límite
    // Si saldo es positivo (cliente debe), resta del límite
    const saldoDisponible = cliente.limiteCredito - saldoActual;

    // Determinar estado de cuenta
    let estadoCuenta: 'al_dia' | 'proximo_limite' | 'limite_excedido' | 'moroso' = 'al_dia';
    // Calcular porcentaje de uso basado en saldo dentro del rango (si se aplicó)
    const porcentajeUso = cliente.limiteCredito > 0 ? (saldoActual / cliente.limiteCredito) * 100 : 0;

    if (cliente.estado === 'moroso') {
      estadoCuenta = 'moroso';
    } else if (saldoActual > cliente.limiteCredito) {
      estadoCuenta = 'limite_excedido';
    } else if (porcentajeUso >= 80) {
      estadoCuenta = 'proximo_limite';
    }

    const nombreCliente = cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre}`.trim();

    res.json({
      success: true,
      data: {
        clienteId: cliente._id,
        nombreCliente,
        limiteCredito: cliente.limiteCredito,
        saldoActual,
        saldoDisponible,
        totalDebe,
        totalHaber,
        estadoCuenta,
        porcentajeUso: Math.round(porcentajeUso),
        movimientosPorTipo,
        fechaUltimoMovimiento: ultimoMovimiento?.fecha || null
      ,
      filtros: {
        desde: desde || null,
        hasta: hasta || null
      }
      }
    });
    return;
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Error al obtener resumen', 
      details: error.message 
    });
  }
};

// @desc    Obtener antigüedad de deuda
// @route   GET /api/cuenta-corriente/:clienteId/antiguedad
// @access  Private
export const getAntiguedadDeuda = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { clienteId } = req.params;

    // Validar cliente
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const hoy = new Date();

    // Obtener ventas pendientes de cobro con su antigüedad
    const movimientosVenta = await MovimientoCuentaCorriente.find({
      clienteId: new mongoose.Types.ObjectId(clienteId),
      tipo: 'venta',
      anulado: false,
      debe: { $gt: 0 } // Solo las que generaron deuda
    }).sort({ fecha: 1 }); // Más antiguas primero

    // Clasificar por antigüedad
    const antiguedad = {
      corriente: { monto: 0, cantidad: 0, items: [] as any[] }, // 0-30 días
      treintaDias: { monto: 0, cantidad: 0, items: [] as any[] }, // 31-60 días
      sesentaDias: { monto: 0, cantidad: 0, items: [] as any[] }, // 61-90 días
      noventaDias: { monto: 0, cantidad: 0, items: [] as any[] } // +90 días
    };

    for (const mov of movimientosVenta) {
      const diasVencidos = Math.floor((hoy.getTime() - mov.fecha.getTime()) / (1000 * 60 * 60 * 24));
      const item = {
        documentoNumero: mov.documentoNumero,
        fecha: mov.fecha,
        diasVencidos,
        monto: mov.debe
      };

      if (diasVencidos <= 30) {
        antiguedad.corriente.monto += mov.debe;
        antiguedad.corriente.cantidad++;
        antiguedad.corriente.items.push(item);
      } else if (diasVencidos <= 60) {
        antiguedad.treintaDias.monto += mov.debe;
        antiguedad.treintaDias.cantidad++;
        antiguedad.treintaDias.items.push(item);
      } else if (diasVencidos <= 90) {
        antiguedad.sesentaDias.monto += mov.debe;
        antiguedad.sesentaDias.cantidad++;
        antiguedad.sesentaDias.items.push(item);
      } else {
        antiguedad.noventaDias.monto += mov.debe;
        antiguedad.noventaDias.cantidad++;
        antiguedad.noventaDias.items.push(item);
      }
    }

    const total = antiguedad.corriente.monto + antiguedad.treintaDias.monto + 
                  antiguedad.sesentaDias.monto + antiguedad.noventaDias.monto;

    const nombreCliente = cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre}`.trim();

    res.json({
      success: true,
      data: {
        clienteId: cliente._id,
        nombreCliente,
        total,
        antiguedad,
        alerta: antiguedad.noventaDias.monto > 0 ? 'Deuda vencida hace más de 90 días' : null
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Error al obtener antigüedad de deuda', 
      details: error.message 
    });
  }
};

// @desc    Crear ajuste manual en cuenta corriente
// @route   POST /api/cuenta-corriente/ajuste
// @access  Private (admin/oper_ad)
export const crearAjuste = async (req: ExpressRequest, res: ExpressResponse) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { clienteId, tipo, monto, concepto, observaciones } = req.body;
    const userId = req.user?._id;
    const userType = req.user?.userType;

    // Validar permisos
    if (userType !== 'admin' && userType !== 'oper_ad') {
      await session.abortTransaction();
      return res.status(403).json({ 
        message: 'No tiene permisos para crear ajustes. Requiere rol admin o oper_ad.' 
      });
    }

    // Validaciones
    if (!clienteId || !tipo || !monto || !concepto) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'ClienteId, tipo, monto y concepto son requeridos' 
      });
    }

    if (!['ajuste_cargo', 'ajuste_descuento'].includes(tipo)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'Tipo debe ser "ajuste_cargo" o "ajuste_descuento"' 
      });
    }

    if (monto <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'El monto debe ser mayor a cero' 
      });
    }

    // Validar cliente
    const cliente = await Cliente.findById(clienteId).session(session);
    if (!cliente) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Obtener saldo actual
    const ultimoMovimiento = await MovimientoCuentaCorriente.findOne({
      clienteId: new mongoose.Types.ObjectId(clienteId),
      anulado: false
    }).sort({ fecha: -1, createdAt: -1 }).session(session);

    const saldoAnterior = ultimoMovimiento?.saldo || 0;

    // Calcular nuevo saldo
    const debe = tipo === 'ajuste_cargo' ? monto : 0;
    const haber = tipo === 'ajuste_descuento' ? monto : 0;
    const nuevoSaldo = saldoAnterior + debe - haber;

    // Generar número de documento
    const countAjustes = await MovimientoCuentaCorriente.countDocuments({
      tipo: { $in: ['ajuste_cargo', 'ajuste_descuento'] }
    }).session(session);
    const numeroAjuste = `AJ-${String(countAjustes + 1).padStart(6, '0')}`;

    // Crear movimiento
    const nuevoMovimiento = await MovimientoCuentaCorriente.create([{
      clienteId,
      fecha: new Date(),
      tipo,
      documentoTipo: 'AJUSTE',
      documentoNumero: numeroAjuste,
      concepto,
      observaciones,
      debe,
      haber,
      saldo: nuevoSaldo,
      creadoPor: userId,
      anulado: false
    }], { session });

    // Actualizar saldo del cliente
    cliente.saldoCuenta = nuevoSaldo;

    // Actualizar estado según nuevo saldo
    if (nuevoSaldo > cliente.limiteCredito) {
      cliente.estado = 'moroso';
    } else if (cliente.estado === 'moroso' && nuevoSaldo <= cliente.limiteCredito) {
      cliente.estado = 'activo';
    }

    await cliente.save({ session });

    await session.commitTransaction();

    const nombreCliente = cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre}`.trim();

    res.status(201).json({
      success: true,
      message: 'Ajuste creado exitosamente',
      data: {
        movimiento: nuevoMovimiento[0],
        saldoAnterior,
        nuevoSaldo,
        cliente: {
          _id: cliente._id,
          nombreCliente,
          saldoCuenta: cliente.saldoCuenta,
          estado: cliente.estado
        }
      }
    });
  } catch (error: any) {
    await session.abortTransaction();
    res.status(500).json({ 
      message: 'Error al crear ajuste', 
      details: error.message 
    });
  } finally {
    session.endSession();
  }
};

// @desc    Anular un movimiento
// @route   PATCH /api/cuenta-corriente/movimientos/:movimientoId/anular
// @access  Private (admin)
export const anularMovimiento = async (req: ExpressRequest, res: ExpressResponse) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { movimientoId } = req.params;
    const { motivo } = req.body;
    const userType = req.user?.userType;

    // Solo admin puede anular movimientos
    if (userType !== 'admin') {
      await session.abortTransaction();
      return res.status(403).json({ 
        message: 'No tiene permisos para anular movimientos. Requiere rol admin.' 
      });
    }

    if (!motivo) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'El motivo de anulación es requerido' });
    }

    const movimiento = await MovimientoCuentaCorriente.findById(movimientoId).session(session);
    
    if (!movimiento) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }

    if (movimiento.anulado) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'El movimiento ya está anulado' });
    }

    // Anular el movimiento
    movimiento.anulado = true;
    movimiento.fechaAnulacion = new Date();
    movimiento.motivoAnulacion = motivo;
    await movimiento.save({ session });

    // Recalcular saldos posteriores
    await recalcularSaldos(movimiento.clienteId, session);

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Movimiento anulado exitosamente',
      data: movimiento
    });
  } catch (error: any) {
    await session.abortTransaction();
    res.status(500).json({ 
      message: 'Error al anular movimiento', 
      details: error.message 
    });
  } finally {
    session.endSession();
  }
};

// Función auxiliar para recalcular saldos
async function recalcularSaldos(clienteId: mongoose.Types.ObjectId, session: any) {
  const movimientos = await MovimientoCuentaCorriente.find({
    clienteId,
    anulado: false
  }).sort({ fecha: 1, createdAt: 1 }).session(session);

  let saldo = 0;
  for (const mov of movimientos) {
    saldo += mov.debe - mov.haber;
    mov.saldo = saldo;
    await mov.save({ session });
  }

  // Actualizar saldo en cliente
  const cliente = await Cliente.findById(clienteId).session(session);
  if (cliente) {
    cliente.saldoCuenta = saldo;
    await cliente.save({ session });
  }
}

// @desc    Generar PDF de estado de cuenta completo
// @route   GET /api/cuenta-corriente/:clienteId/pdf/estado-cuenta
// @access  Private
export const generarPDFEstadoCuenta = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { clienteId } = req.params;
    const { desde, hasta, incluirIntereses = 'false' } = req.query;

    // Obtener cliente
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Construir filtros para movimientos
    const filtros: any = { 
      clienteId: new mongoose.Types.ObjectId(clienteId),
      anulado: false
    };

    if (desde || hasta) {
      filtros.fecha = {};
      if (desde) filtros.fecha.$gte = new Date(desde as string);
      if (hasta) filtros.fecha.$lte = new Date(hasta as string);
    }

    // Obtener movimientos
    const movimientos = await MovimientoCuentaCorriente.find(filtros)
      .sort({ fecha: 1, createdAt: 1 })
      .lean();

    // Calcular resumen
    const ultimoMovimiento = movimientos[movimientos.length - 1];
    const saldoActual = ultimoMovimiento?.saldo || 0;
    const limiteCredito = cliente.limiteCredito || 0;
    const creditoDisponible = limiteCredito - saldoActual;
    const porcentajeUso = limiteCredito > 0 ? (saldoActual / limiteCredito) * 100 : 0;

    let estado = 'al_dia';
    if (saldoActual > limiteCredito) estado = 'moroso';
    else if (saldoActual > limiteCredito * 0.9) estado = 'limite_excedido';
    else if (saldoActual > limiteCredito * 0.7) estado = 'proximo_limite';

    const resumen = {
      saldoActual,
      limiteCredito,
      creditoDisponible,
      estado,
      porcentajeUso
    };

    // Interpretar el parámetro incluirIntereses robustamente (acepta 'true', true, '1', 'on')
    const incluirInteresesParam = typeof incluirIntereses === 'string' ? incluirIntereses : (incluirIntereses as any)?.toString?.() || '';
    const incluirInteresesFlag = ['true', '1', 'on', 'True', 'TRUE'].includes(incluirInteresesParam);

    // Obtener intereses si se solicitan
    let intereses: any[] = [];
    if (incluirInteresesFlag) {
      intereses = await InteresPunitorio.find({
        clienteId: new mongoose.Types.ObjectId(clienteId),
        anulado: false
      }).sort({ fechaInicio: -1 }).lean();
    }

    // Debug logs to track which path is chosen (useful for tests/dev)
    console.debug('[PDF EstadoCuenta] incluirIntereses param:', incluirIntereses, 'flag:', incluirInteresesFlag);
    console.debug('[PDF EstadoCuenta] intereses.length:', intereses.length);
    console.debug('[PDF EstadoCuenta] generarEstadoCuentaCompleto used?', incluirInteresesFlag && intereses.length > 0);

    // Datos de la empresa (configurar según necesidad)
    const datosEmpresa = {
      nombre: process.env.EMPRESA_RAZON_SOCIAL || 'MI EMPRESA',
      direccion: process.env.EMPRESA_DOMICILIO || 'Dirección de la empresa',
      telefono: process.env.EMPRESA_TELEFONO || '(123) 456-7890',
      email: process.env.EMPRESA_EMAIL || 'contacto@empresa.com',
      cuit: process.env.EMPRESA_CUIT_PDF || '12-34567890-1'
    };

    // Datos del cliente
    const datosCliente = {
      razonSocial: cliente.razonSocial,
      apellido: cliente.apellido,
      nombre: cliente.nombre,
      numeroDocumento: cliente.numeroDocumento,
      direccion: cliente.direccion,
      telefono: cliente.telefono,
      email: cliente.email
    };

    // Generar PDF
    const pdfGenerator = new PDFGenerator();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=estado-cuenta-${cliente.numeroDocumento}-${Date.now()}.pdf`);
    
    pdfGenerator.pipe(res);
    
    if (incluirInteresesFlag && intereses.length > 0) {
      pdfGenerator.generarEstadoCuentaCompleto(datosEmpresa, datosCliente, resumen, movimientos as any, intereses as any);
    } else {
      pdfGenerator.generarResumenMovimientos(datosEmpresa, datosCliente, resumen, movimientos as any);
    }
    
    pdfGenerator.end();

  } catch (error: any) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ 
      message: 'Error al generar PDF', 
      details: error.message 
    });
  }
};

// @desc    Generar PDF solo de movimientos
// @route   GET /api/cuenta-corriente/:clienteId/pdf/movimientos
// @access  Private
export const generarPDFMovimientos = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { clienteId } = req.params;
    const { desde, hasta } = req.query;

    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const filtros: any = { 
      clienteId: new mongoose.Types.ObjectId(clienteId),
      anulado: false
    };

    if (desde || hasta) {
      filtros.fecha = {};
      if (desde) filtros.fecha.$gte = new Date(desde as string);
      if (hasta) filtros.fecha.$lte = new Date(hasta as string);
    }

    const movimientos = await MovimientoCuentaCorriente.find(filtros)
      .sort({ fecha: 1, createdAt: 1 })
      .lean();

    const ultimoMovimiento = movimientos[movimientos.length - 1];
    const saldoActual = ultimoMovimiento?.saldo || 0;
    const limiteCredito = cliente.limiteCredito || 0;
    const creditoDisponible = limiteCredito - saldoActual;
    const porcentajeUso = limiteCredito > 0 ? (saldoActual / limiteCredito) * 100 : 0;

    let estado = 'al_dia';
    if (saldoActual > limiteCredito) estado = 'moroso';
    else if (saldoActual > limiteCredito * 0.9) estado = 'limite_excedido';
    else if (saldoActual > limiteCredito * 0.7) estado = 'proximo_limite';

    const resumen = {
      saldoActual,
      limiteCredito,
      creditoDisponible,
      estado,
      porcentajeUso
    };

    const datosEmpresa = {
      nombre: process.env.EMPRESA_RAZON_SOCIAL || 'MI EMPRESA',
      direccion: process.env.EMPRESA_DOMICILIO || 'Dirección de la empresa',
      telefono: process.env.EMPRESA_TELEFONO || '(123) 456-7890',
      email: process.env.EMPRESA_EMAIL || 'contacto@empresa.com',
      cuit: process.env.EMPRESA_CUIT_PDF || '12-34567890-1'
    };

    const datosCliente = {
      razonSocial: cliente.razonSocial,
      apellido: cliente.apellido,
      nombre: cliente.nombre,
      numeroDocumento: cliente.numeroDocumento,
      direccion: cliente.direccion,
      telefono: cliente.telefono,
      email: cliente.email
    };

    const pdfGenerator = new PDFGenerator();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=movimientos-${cliente.numeroDocumento}-${Date.now()}.pdf`);
    
    pdfGenerator.pipe(res);
    pdfGenerator.generarResumenMovimientos(datosEmpresa, datosCliente, resumen, movimientos as any);
    pdfGenerator.end();

  } catch (error: any) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ 
      message: 'Error al generar PDF', 
      details: error.message 
    });
  }
};
