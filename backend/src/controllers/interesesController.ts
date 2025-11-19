import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import ReciboPago from '../models/ReciboPago.js';
import Gasto from '../models/Gasto.js';
import MovimientoCuentaCorriente from '../models/MovimientoCuentaCorriente.js';
import ConfiguracionIntereses from '../models/ConfiguracionIntereses.js';
import InteresPunitorio from '../models/InteresPunitorio.js';
import Cliente from '../models/Cliente.js';
import Venta from '../models/Venta.js';
import { PDFGenerator } from '../utils/pdfGenerator.js';
import { ejecutarCalculoManual, crearInteresesDesdeVentas } from '../jobs/calcularInteresesPunitorios.js';

// ========== CONFIGURACIÓN DE INTERESES ==========

// @desc    Obtener configuración vigente
// @route   GET /api/intereses/configuracion/vigente
// @access  Private
export const getConfiguracionVigente = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await (ConfiguracionIntereses as any).obtenerVigente();
    
    if (!config) {
      res.status(404).json({ message: 'No hay configuración vigente' });
      return;
    }
    
    res.json(config);
  } catch (error: any) {
    console.error('Error al obtener configuración vigente:', error);
    res.status(500).json({ message: 'Error al obtener configuración', error: error.message });
  }
};

// @desc    Obtener historial de configuraciones
// @route   GET /api/intereses/configuracion
// @access  Private
export const getConfiguraciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const configuraciones = await ConfiguracionIntereses.find()
      .sort({ fechaVigenciaDesde: -1 })
      .limit(50);
    
    res.json(configuraciones);
  } catch (error: any) {
    console.error('Error al obtener configuraciones:', error);
    res.status(500).json({ message: 'Error al obtener configuraciones', error: error.message });
  }
};

// @desc    Crear nueva configuración de tasa
// @route   POST /api/intereses/configuracion
// @access  Private (admin/oper_ad)
export const crearConfiguracion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tasaMensualVigente, fechaVigenciaDesde, aplicaDesde, fuenteReferencia, observaciones } = req.body;
    const username = (req as any).user?.username || 'sistema';
    
    // Validaciones
    if (!tasaMensualVigente || !fuenteReferencia) {
      res.status(400).json({ message: 'Tasa mensual y fuente de referencia son requeridos' });
      return;
    }
    
    // Cerrar configuración anterior si existe
    const configAnterior = await (ConfiguracionIntereses as any).obtenerVigente();
    if (configAnterior) {
      const nuevaFechaDesde = fechaVigenciaDesde ? new Date(fechaVigenciaDesde) : new Date();
      configAnterior.fechaVigenciaHasta = new Date(nuevaFechaDesde.getTime() - 1); // 1ms antes
      await configAnterior.save();
    }
    
    // Crear nueva configuración
    const nuevaConfig = new ConfiguracionIntereses({
      tasaMensualVigente,
      fechaVigenciaDesde: fechaVigenciaDesde || new Date(),
      aplicaDesde: aplicaDesde || 31,
      fuenteReferencia,
      observaciones,
      creadoPor: username
    });
    
    const configGuardada = await nuevaConfig.save();
    
    res.status(201).json({
      message: 'Configuración creada exitosamente',
      config: configGuardada
    });
  } catch (error: any) {
    console.error('Error al crear configuración:', error);
    res.status(500).json({ message: 'Error al crear configuración', error: error.message });
  }
};

// ========== GESTIÓN DE INTERESES PUNITORIOS ==========

// @desc    Obtener intereses por cliente
// @route   GET /api/intereses/cliente/:clienteId
// @access  Private
export const getInteresesPorCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clienteId } = req.params;
    const { estado } = req.query;
    
    const filtros: any = { clienteId };
    if (estado) filtros.estado = estado;
    
    const intereses = await InteresPunitorio.find(filtros)
      .populate('clienteId', 'nombre apellido razonSocial numeroDocumento')
      .sort({ createdAt: -1 });
    
    res.json(intereses);
  } catch (error: any) {
    console.error('Error al obtener intereses por cliente:', error);
    res.status(500).json({ message: 'Error al obtener intereses', error: error.message });
  }
};

// @desc    Obtener todos los intereses con filtros
// @route   GET /api/intereses
// @access  Private
export const getIntereses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado, clienteId, fechaDesde, fechaHasta } = req.query;
    
    const filtros: any = {};
    if (estado) filtros.estado = estado;
    if (clienteId) filtros.clienteId = clienteId;
    if (fechaDesde || fechaHasta) {
      filtros.createdAt = {};
      if (fechaDesde) filtros.createdAt.$gte = new Date(fechaDesde as string);
      if (fechaHasta) filtros.createdAt.$lte = new Date(fechaHasta as string);
    }
    
    const intereses = await InteresPunitorio.find(filtros)
      .populate('clienteId', 'nombre apellido razonSocial numeroDocumento')
      .sort({ fechaFinCalculo: -1 });
    
    res.json(intereses);
  } catch (error: any) {
    console.error('Error al obtener intereses:', error);
    res.status(500).json({ message: 'Error al obtener intereses', error: error.message });
  }
};

// @desc    Obtener detalle de un interés
// @route   GET /api/intereses/:id
// @access  Private
export const getInteresById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const interes = await InteresPunitorio.findById(id)
      .populate('clienteId', 'nombre apellido razonSocial numeroDocumento limiteCredito');
    
    if (!interes) {
      res.status(404).json({ message: 'Interés no encontrado' });
      return;
    }
    
    res.json(interes);
  } catch (error: any) {
    console.error('Error al obtener interés:', error);
    res.status(500).json({ message: 'Error al obtener interés', error: error.message });
  }
};

// @desc    Actualizar cálculo de interés manualmente
// @route   PATCH /api/intereses/:id/calcular
// @access  Private
export const actualizarCalculoInteres = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const username = (req as any).user?.username || 'usuario';
    
    const interes = await InteresPunitorio.findById(id);
    if (!interes) {
      res.status(404).json({ message: 'Interés no encontrado' });
      return;
    }
    
    await (interes as any).actualizarCalculo(username);
    
    res.json({
      message: 'Cálculo actualizado exitosamente',
      interes
    });
  } catch (error: any) {
    console.error('Error al actualizar cálculo:', error);
    res.status(500).json({ message: 'Error al actualizar cálculo', error: error.message });
  }
};

// @desc    Cobrar intereses (genera Nota de Débito)
// @route   POST /api/intereses/:id/cobrar
// @access  Private (admin/oper_ad)
export const cobrarIntereses = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { montoCobrar, observaciones, formasPago } = req.body;
    const userId = (req as any).user?._id;
    if (!userId) {
      await session.abortTransaction();
      res.status(403).json({ message: 'Se requiere autenticación para cobrar intereses' });
      return;
    }

    // Permitir pasar formasPago[] o montoCobrar + medioPago
    let formas: any[] = [];
    if (formasPago && Array.isArray(formasPago) && formasPago.length > 0) {
      formas = formasPago;
    } else {
      // Fallback: usar montoCobrar sin especificar medio de pago -> efectivo
      if (!montoCobrar || montoCobrar <= 0) {
        await session.abortTransaction();
        res.status(400).json({ message: 'Debe indicar el monto a cobrar o proporcionar formas de pago' });
        return;
      }
      formas = [{ medioPago: 'EFECTIVO', monto: montoCobrar, banco: 'EFECTIVO' }];
    }

    const totalFormasPago = formas.reduce((sum, f) => sum + (f.monto || 0), 0);

    const interes = await InteresPunitorio.findById(id).session(session);
    if (!interes) {
      await session.abortTransaction();
      res.status(404).json({ message: 'Interés no encontrado' });
      return;
    }

    // Validar que el monto no supere el pendiente
    if (totalFormasPago > interes.interesPendiente) {
      await session.abortTransaction();
      res.status(400).json({ 
        message: 'El monto supera el interés pendiente',
        pendiente: interes.interesPendiente
      });
      return;
    }

    // Obtener cliente
    const cliente = await Cliente.findById(interes.clienteId).session(session);
    if (!cliente) {
      await session.abortTransaction();
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }

    // Crear recibo (regularización) similar a crearRecibo
    const nombreCliente = cliente.razonSocial || `${cliente.apellido || ''} ${cliente.nombre || ''}`.trim();
    const documentoCliente = cliente.numeroDocumento;

    const nuevoRecibo = new ReciboPago({
      fecha: new Date(),
      clienteId: cliente._id,
      nombreCliente,
      documentoCliente,
      ventasRelacionadas: [], // regularización por intereses
      formasPago: formas,
      totales: {
        totalACobrar: totalFormasPago,
        totalCobrado: totalFormasPago,
        vuelto: 0,
        saldoPendiente: 0
      },
      momentoCobro: 'diferido',
      estadoRecibo: 'activo',
      observaciones: observaciones || `Cobro de intereses #${interes._id}`,
      creadoPor: userId
    });

    const reciboGuardado = await nuevoRecibo.save({ session });

    // Determinar total cobrado real (excluyendo CUENTA_CORRIENTE)
    const formasPagoReales = formas.filter((fp) => fp.medioPago !== 'CUENTA_CORRIENTE');
    const totalCobradoReal = formasPagoReales.reduce((sum, fp) => sum + (fp.monto || 0), 0);

    // Registrar movimiento en cuenta corriente si hay cobros reales
    if (totalCobradoReal > 0) {
      const ultimoMovimiento = await MovimientoCuentaCorriente.findOne({ clienteId: cliente._id, anulado: false })
        .sort({ fecha: -1, createdAt: -1 })
        .session(session);

      const saldoAnterior = ultimoMovimiento?.saldo || 0;
      const nuevoSaldo = saldoAnterior - totalCobradoReal;

      await MovimientoCuentaCorriente.create([{
        clienteId: cliente._id,
        fecha: new Date(),
        tipo: 'recibo',
        documentoTipo: 'RECIBO',
        documentoNumero: reciboGuardado.numeroRecibo || 'PENDIENTE',
        documentoId: reciboGuardado._id,
        concepto: `Cobro intereses - ${reciboGuardado.numeroRecibo || 'PENDIENTE'}`,
        debe: 0,
        haber: totalCobradoReal,
        saldo: nuevoSaldo,
        creadoPor: (req as any).user?._id || undefined,
        anulado: false
      }], { session });

      // Actualizar saldo del cliente
      cliente.saldoCuenta = nuevoSaldo;
      await cliente.save({ session });
    }

    // Registrar cada forma de pago como un Gasto de tipo entrada (ingreso), excepto CUENTA_CORRIENTE
    for (const formaPago of formasPagoReales) {
      // Mapear medioPago de ReciboPago a enum de Gasto
      let medioPagoGasto = formaPago.medioPago;
      if (formaPago.medioPago === 'CHEQUE') medioPagoGasto = 'CHEQUE TERCERO';
      if (formaPago.medioPago === 'TARJETA_DEBITO') medioPagoGasto = 'TARJETA DÉBITO';
      if (formaPago.medioPago === 'TARJETA_CREDITO') medioPagoGasto = 'TARJETA CRÉDITO';

      // Determinar banco/caja destino
      let bancoDestino = formaPago.banco || 'EFECTIVO';

      await Gasto.create([{
        fecha: new Date(),
        rubro: 'COBRO.VENTA',
        subRubro: 'COBRO',
        medioDePago: medioPagoGasto,
        numeroCheque: formaPago.medioPago === 'CHEQUE' && formaPago.datosCheque ? formaPago.datosCheque.numeroCheque : undefined,
        clientes: nombreCliente,
        detalleGastos: `Cobro intereses - Recibo ${reciboGuardado.numeroRecibo || 'PENDIENTE'} - ${nombreCliente}`,
        tipoOperacion: 'entrada',
        comentario: observaciones || `Cobro intereses ${interes._id}`,
        estado: 'activo',
        confirmado: true,
        entrada: formaPago.monto,
        salida: 0,
        banco: bancoDestino
      }], { session });
    }

    // Actualizar el interés con la información del cobro
    interes.interesCobrado += totalFormasPago;
    interes.interesPendiente -= totalFormasPago;
    if (interes.interesPendiente === 0) {
      interes.estado = 'cobrado_total';
    } else {
      interes.estado = 'cobrado_parcial';
    }
    interes.acciones.push({
      fecha: new Date(),
      tipo: 'cobro',
      monto: totalFormasPago,
      usuario: (req as any).user?.username || 'usuario',
      observaciones: observaciones || `Cobro de intereses - recibo ${reciboGuardado.numeroRecibo || 'PENDIENTE'}`,
      notaDebitoId: undefined
    } as any);

    await interes.save({ session });

    await session.commitTransaction();

    const receip = await ReciboPago.findById(reciboGuardado._id).populate('clienteId');

    res.json({ message: 'Intereses cobrados exitosamente', interes, recibo: receip, montoCobrado: totalFormasPago, pendienteRestante: interes.interesPendiente });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error al cobrar intereses:', error);
    res.status(500).json({ message: 'Error al cobrar intereses', error: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Condonar intereses
// @route   POST /api/intereses/:id/condonar
// @access  Private (solo admin)
export const condonarIntereses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { montoCondonar, motivo } = req.body;
    const username = (req as any).user?.username || 'usuario';
    const userType = (req as any).user?.userType;
    
    // Solo admin puede condonar
    if (userType !== 'admin') {
      res.status(403).json({ message: 'Solo administradores pueden condonar intereses' });
      return;
    }
    
    if (!montoCondonar || montoCondonar <= 0) {
      res.status(400).json({ message: 'El monto a condonar debe ser mayor a 0' });
      return;
    }
    
    if (!motivo) {
      res.status(400).json({ message: 'El motivo de condonación es requerido' });
      return;
    }
    
    const interes = await InteresPunitorio.findById(id);
    if (!interes) {
      res.status(404).json({ message: 'Interés no encontrado' });
      return;
    }
    
    // Validar que el monto no supere el pendiente
    if (montoCondonar > interes.interesPendiente) {
      res.status(400).json({ 
        message: 'El monto supera el interés pendiente',
        pendiente: interes.interesPendiente
      });
      return;
    }
    
    // Actualizar montos del interés
    interes.interesCondonado += montoCondonar;
    interes.interesPendiente -= montoCondonar;
    
    // Actualizar estado
    if (interes.interesPendiente === 0) {
      interes.estado = interes.interesCobrado > 0 ? 'cobrado_parcial' : 'condonado_total';
    } else {
      interes.estado = 'condonado_parcial';
    }
    
    // Registrar acción de condonación
    interes.acciones.push({
      fecha: new Date(),
      tipo: 'condonacion',
      monto: montoCondonar,
      usuario: username,
      observaciones: motivo
    } as any);
    
    await interes.save();
    
    res.json({
      message: 'Intereses condonados exitosamente',
      interes,
      montoCondonado: montoCondonar,
      pendienteRestante: interes.interesPendiente
    });
  } catch (error: any) {
    console.error('Error al condonar intereses:', error);
    res.status(500).json({ message: 'Error al condonar intereses', error: error.message });
  }
};

// @desc    Obtener estadísticas de intereses
// @route   GET /api/intereses/estadisticas
// @access  Private
export const getEstadisticasIntereses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    const filtros: any = {};
    if (fechaDesde || fechaHasta) {
      filtros.createdAt = {};
      if (fechaDesde) filtros.createdAt.$gte = new Date(fechaDesde as string);
      if (fechaHasta) filtros.createdAt.$lte = new Date(fechaHasta as string);
    }
    
    const intereses = await InteresPunitorio.find(filtros);
    
    const estadisticas = {
      totalRegistros: intereses.length,
      totalDevengado: intereses.reduce((sum, i) => sum + i.interesDevengado, 0),
      totalCobrado: intereses.reduce((sum, i) => sum + i.interesCobrado, 0),
      totalCondonado: intereses.reduce((sum, i) => sum + i.interesCondonado, 0),
      totalPendiente: intereses.reduce((sum, i) => sum + i.interesPendiente, 0),
      
      porEstado: {
        devengando: intereses.filter(i => i.estado === 'devengando').length,
        cobradoParcial: intereses.filter(i => i.estado === 'cobrado_parcial').length,
        cobradoTotal: intereses.filter(i => i.estado === 'cobrado_total').length,
        condonadoParcial: intereses.filter(i => i.estado === 'condonado_parcial').length,
        condonadoTotal: intereses.filter(i => i.estado === 'condonado_total').length
      },
      
      diasPromedio: intereses.length > 0 
        ? Math.round(intereses.reduce((sum, i) => sum + i.diasTranscurridos, 0) / intereses.length)
        : 0
    };
    
    res.json(estadisticas);
  } catch (error: any) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
};

// @desc    Generar PDF de intereses punitorios por cliente
// @route   GET /api/intereses/cliente/:clienteId/pdf
// @access  Private
export const generarPDFInteresesCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clienteId } = req.params;
    const { estado } = req.query;
    
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      res.status(404).json({ message: 'Cliente no encontrado' });
      return;
    }
    
    const filtros: any = { clienteId };
    if (estado) filtros.estado = estado;
    
    const intereses = await InteresPunitorio.find(filtros)
      .sort({ fechaInicio: -1 })
      .lean();
    
    if (intereses.length === 0) {
      res.status(404).json({ message: 'No hay intereses registrados para este cliente' });
      return;
    }
    
    const datosEmpresa = {
      nombre: process.env.EMPRESA_NOMBRE || 'MI EMPRESA',
      direccion: process.env.EMPRESA_DIRECCION || 'Dirección de la empresa',
      telefono: process.env.EMPRESA_TELEFONO || '(123) 456-7890',
      email: process.env.EMPRESA_EMAIL || 'contacto@empresa.com',
      cuit: process.env.EMPRESA_CUIT || '12-34567890-1'
    };
    
    const datosCliente = {
      razonSocial: cliente.razonSocial || undefined,
      apellido: cliente.apellido || undefined,
      nombre: cliente.nombre || '',
      numeroDocumento: cliente.numeroDocumento,
      direccion: cliente.direccion || undefined,
      telefono: cliente.telefono || undefined,
      email: cliente.email || undefined
    };
    
    const pdfGenerator = new PDFGenerator();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=intereses-${cliente.numeroDocumento}-${Date.now()}.pdf`);
    
    pdfGenerator.pipe(res);
    pdfGenerator.generarReporteIntereses(datosEmpresa, datosCliente, intereses as any);
    pdfGenerator.end();
    
  } catch (error: any) {
    console.error('Error generando PDF de intereses:', error);
    res.status(500).json({ message: 'Error al generar PDF', error: error.message });
  }
};

// @desc    Crear intereses punitorios a partir de ventas vencidas
// @route   POST /api/intereses/crear/desde-ventas
// @access  Private (admin/oper_ad) - Permitir sin auth en dev
export const crearInteresesDesdeVentasHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar autorización: permitir con x-dev-api-key en entornos de desarrollo o si ALLOW_INTERES_CALC_NO_AUTH
    const allowNoAuth = process.env.NODE_ENV === 'development' || process.env.ALLOW_INTERES_CALC_NO_AUTH === 'true';
    const devApiKeyHeader = req.headers['x-dev-api-key'] as string | undefined;
    const devApiKey = process.env.DEV_API_KEY;
    const devKeyMatches = devApiKey && devApiKeyHeader && devApiKeyHeader === devApiKey;

    if (!allowNoAuth && !devKeyMatches) {
      const userType = (req as any).user?.userType;
      if (!userType || (userType !== 'admin' && userType !== 'oper_ad')) {
        res.status(403).json({ message: 'Acceso denegado: sólo administradores y oper_ad pueden crear intereses desde ventas' });
        return;
      }
    }

    // Reutilizar la función del job para crear intereses desde ventas vencidas
    const result = await crearInteresesDesdeVentas();
    if (!result || !result.success) {
      res.status(500).json({ message: 'Error al crear intereses', error: result?.error || result?.message });
      return;
    }

    res.json({ message: 'Intereses creados desde ventas vencidas', creados: result.creados, errores: result.errores });
  } catch (error: any) {
    console.error('Error creando intereses desde ventas:', error);
    res.status(500).json({ message: 'Error creando intereses desde ventas', error: error.message });
  }
};

// @desc    Ejecutar cálculo manual de intereses (trigger manual)
// @route   POST /api/intereses/calcular/manual
// @access  Private (admin/oper_ad)
export const ejecutarCalculoManualHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Permitir sin auth en entornos de desarrollo o cuando ALLOW_INTERES_CALC_NO_AUTH=true
    const allowNoAuth = process.env.NODE_ENV === 'development' || process.env.ALLOW_INTERES_CALC_NO_AUTH === 'true';
    const devApiKeyHeader = req.headers['x-dev-api-key'] as string | undefined;
    const devApiKey = process.env.DEV_API_KEY;
    const devKeyMatches = devApiKey && devApiKeyHeader && devApiKeyHeader === devApiKey;

    if (!allowNoAuth && !devKeyMatches) {
      const userType = (req as any).user?.userType;
      if (!userType || (userType !== 'admin' && userType !== 'oper_ad')) {
        res.status(403).json({ message: 'Acceso denegado: sólo administradores y oper_ad pueden ejecutar el cálculo manual' });
        return;
      }
    } else {
      console.warn('[SECURITY] Ejecutando cálculo manual sin autenticación (entorno dev o ALLOW_INTERES_CALC_NO_AUTH or x-dev-api-key)');
    }

    const result = await ejecutarCalculoManual();
    if (result && result.success) {
      res.json({ message: 'Cálculo manual ejecutado', actualizados: result.actualizados, creados: result.creados });
    } else {
      res.status(500).json({ message: 'Error ejecutando cálculo manual', error: result?.error || 'error desconocido' });
    }
  } catch (error: any) {
    console.error('Error al ejecutar cálculo manual desde endpoint:', error);
    res.status(500).json({ message: 'Error al ejecutar cálculo manual', error: error.message });
  }
};
