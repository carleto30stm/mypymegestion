import type { Request, Response } from 'express';
import Factura from '../models/Factura.js';
import type { IFactura, TipoComprobante } from '../models/Factura.js';
import Venta from '../models/Venta.js';
import Cliente from '../models/Cliente.js';
import AFIPService from '../services/afipService.js';

// Helper para obtener configuración de AFIP (lee variables al momento de la llamada)
const getAfipConfig = () => ({
  CUIT: process.env.AFIP_CUIT || '',
  production: process.env.AFIP_PRODUCTION === 'true',
  ta_folder: process.env.AFIP_TA_FOLDER || './afip_tokens'
});

// Helper para obtener datos de la empresa (lee variables al momento de la llamada)
const getEmpresaData = () => ({
  cuit: process.env.EMPRESA_CUIT || '',
  razonSocial: process.env.EMPRESA_RAZON_SOCIAL || '',
  domicilio: process.env.EMPRESA_DOMICILIO || '',
  condicionIVA: process.env.EMPRESA_CONDICION_IVA || 'Responsable Inscripto',
  ingresosBrutos: process.env.EMPRESA_IIBB || '',
  inicioActividades: new Date(process.env.EMPRESA_INICIO_ACTIVIDADES || '2020-01-01'),
  puntoVenta: parseInt(process.env.AFIP_PUNTO_VENTA || '1')
});

/**
 * Crear factura desde una venta
 */
export const crearFacturaDesdeVenta = async (req: Request, res: Response) => {
  try {
    const { ventaId } = req.body;
    const username = (req as any).user?.username || 'sistema';

    // Obtener configuración de empresa
    const EMPRESA = getEmpresaData();

    // Validar que los datos de la empresa estén configurados
    if (!EMPRESA.cuit || !EMPRESA.razonSocial || !EMPRESA.domicilio) {
      return res.status(500).json({ 
        error: 'Configuración de empresa incompleta',
        detalle: 'Faltan variables de entorno: EMPRESA_CUIT, EMPRESA_RAZON_SOCIAL o EMPRESA_DOMICILIO'
      });
    }

    // Buscar la venta
    const venta = await Venta.findById(ventaId).populate('clienteId');
    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    // Buscar el cliente
    const cliente = await Cliente.findById(venta.clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Determinar tipo de factura según condiciones IVA
    const tipoComprobante = AFIPService.determinarTipoFactura(
      EMPRESA.condicionIVA,
      cliente.condicionIVA
    );

    // Determinar si el comprobante discrimina IVA
    const discriminaIVA = tipoComprobante === 'FACTURA_A';
    
    // Alícuota IVA por defecto (21% para productos)
    const alicuotaIVA = discriminaIVA ? 21 : 0;

    // Convertir items de venta a items de factura
    const items = venta.items.map(item => {
      const importeNeto = item.total; // Total ya con descuento
      const importeIVA = discriminaIVA 
        ? AFIPService.calcularIVA(importeNeto, alicuotaIVA)
        : 0;
      
      return {
        codigo: item.codigoProducto,
        descripcion: item.nombreProducto,
        cantidad: item.cantidad,
        unidadMedida: '7', // Unidades
        precioUnitario: item.precioUnitario,
        importeBruto: item.subtotal,
        importeDescuento: item.descuento,
        importeNeto: importeNeto,
        alicuotaIVA: alicuotaIVA,
        importeIVA: importeIVA,
        importeTotal: importeNeto + importeIVA
      };
    });

    // Crear factura
    const factura = new Factura({
      ventaId: venta._id,
      clienteId: cliente._id,
      tipoComprobante,
      estado: 'borrador',
      
      // Datos emisor
      emisorCUIT: EMPRESA.cuit,
      emisorRazonSocial: EMPRESA.razonSocial,
      emisorDomicilio: EMPRESA.domicilio,
      emisorCondicionIVA: EMPRESA.condicionIVA,
      emisorIngresosBrutos: EMPRESA.ingresosBrutos,
      emisorInicioActividades: EMPRESA.inicioActividades,
      
      // Datos receptor
      receptorTipoDocumento: AFIPService.obtenerCodigoTipoDocumento(cliente.tipoDocumento),
      receptorNumeroDocumento: cliente.numeroDocumento,
      receptorRazonSocial: cliente.razonSocial || `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
      receptorDomicilio: cliente.direccion,
      receptorCondicionIVA: cliente.condicionIVA,
      
      // Fechas
      fecha: venta.fecha,
      
      // Items
      items,
      
      // Totales se calculan automáticamente en el middleware
      subtotal: 0,
      descuentoTotal: 0,
      importeNetoGravado: 0,
      importeNoGravado: 0,
      importeExento: 0,
      importeIVA: 0,
      importeOtrosTributos: 0,
      importeTotal: 0,
      detalleIVA: [],
      
      // Datos AFIP
      datosAFIP: {
        puntoVenta: EMPRESA.puntoVenta
      },
      
      // Otros
      concepto: 1, // Productos
      monedaId: 'PES',
      cotizacionMoneda: 1,
      usuarioCreador: username
    });

    await factura.save();

    res.status(201).json({
      message: 'Factura creada exitosamente (borrador)',
      factura
    });
  } catch (error: any) {
    console.error('Error al crear factura:', error);
    res.status(500).json({ 
      error: 'Error al crear factura', 
      detalle: error.message 
    });
  }
};

/**
 * Crear factura desde múltiples ventas (agrupación)
 */
export const crearFacturaDesdeVentas = async (req: Request, res: Response) => {
  try {
    const { ventasIds } = req.body;
    const username = (req as any).user?.username || 'sistema';

    // Validar que ventas sea un array
    if (!Array.isArray(ventasIds) || ventasIds.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos una venta' });
    }

    // Obtener configuración de empresa
    const EMPRESA = getEmpresaData();

    // Validar configuración
    if (!EMPRESA.cuit || !EMPRESA.razonSocial || !EMPRESA.domicilio) {
      return res.status(500).json({ 
        error: 'Configuración de empresa incompleta',
        detalle: 'Faltan variables de entorno: EMPRESA_CUIT, EMPRESA_RAZON_SOCIAL o EMPRESA_DOMICILIO'
      });
    }

    // Buscar todas las ventas
    const ventas = await Venta.find({ _id: { $in: ventasIds } }).populate('clienteId');
    
    if (ventas.length === 0) {
      return res.status(404).json({ error: 'No se encontraron ventas' });
    }

    if (ventas.length !== ventasIds.length) {
      return res.status(400).json({ error: 'Algunas ventas no existen' });
    }

    // Validar que todas las ventas sean del mismo cliente
    const primeraVenta = ventas[0]!; // Type assertion: sabemos que existe por validación anterior
    const primerClienteId = primeraVenta.clienteId._id.toString();
    const todosDelMismoCliente = ventas.every(v => v.clienteId._id.toString() === primerClienteId);
    
    if (!todosDelMismoCliente) {
      return res.status(400).json({ error: 'Todas las ventas deben ser del mismo cliente' });
    }

    // Validar que ninguna venta esté ya facturada
    const algunaFacturada = ventas.some(v => v.facturada);
    if (algunaFacturada) {
      return res.status(400).json({ error: 'Algunas ventas ya están facturadas' });
    }

    // Validar que todas requieran factura AFIP o tengan IVA aplicado
    const todasRequierenFactura = ventas.every(v => v.requiereFacturaAFIP || v.aplicaIVA);
    if (!todasRequierenFactura) {
      return res.status(400).json({ error: 'Todas las ventas deben requerir factura AFIP o tener IVA aplicado' });
    }

    // Obtener cliente
    const cliente = await Cliente.findById(primerClienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Determinar tipo de factura
    const tipoComprobante = AFIPService.determinarTipoFactura(
      EMPRESA.condicionIVA,
      cliente.condicionIVA
    );

    const discriminaIVA = tipoComprobante === 'FACTURA_A';
    const alicuotaIVA = discriminaIVA ? 21 : 0;

    // Agrupar items de todas las ventas
    const itemsMap = new Map();
    
    ventas.forEach(venta => {
      venta.items.forEach(item => {
        const key = `${item.codigoProducto}-${item.precioUnitario}`;
        
        if (itemsMap.has(key)) {
          const existing = itemsMap.get(key);
          existing.cantidad += item.cantidad;
          existing.importeBruto += item.subtotal;
          existing.importeDescuento += item.descuento;
          existing.importeNeto += item.total;
        } else {
          itemsMap.set(key, {
            codigo: item.codigoProducto,
            descripcion: item.nombreProducto,
            cantidad: item.cantidad,
            unidadMedida: '7',
            precioUnitario: item.precioUnitario,
            importeBruto: item.subtotal,
            importeDescuento: item.descuento,
            importeNeto: item.total,
            alicuotaIVA: alicuotaIVA,
            importeIVA: 0, // Se calculará después
            importeTotal: 0
          });
        }
      });
    });

    // Calcular IVA para cada item agrupado
    const items = Array.from(itemsMap.values()).map(item => {
      const importeIVA = discriminaIVA 
        ? AFIPService.calcularIVA(item.importeNeto, alicuotaIVA)
        : 0;
      
      return {
        ...item,
        importeIVA,
        importeTotal: item.importeNeto + importeIVA
      };
    });
    // Crear factura
    const factura = new Factura({
      ventaId: primeraVenta._id, // Por compatibilidad
      ventasRelacionadas: ventasIds,
      clienteId: cliente._id,
      tipoComprobante,
      estado: 'borrador',
      
      // Datos emisor
      emisorCUIT: EMPRESA.cuit,
      emisorRazonSocial: EMPRESA.razonSocial,
      emisorDomicilio: EMPRESA.domicilio,
      emisorCondicionIVA: EMPRESA.condicionIVA,
      emisorIngresosBrutos: EMPRESA.ingresosBrutos,
      emisorInicioActividades: EMPRESA.inicioActividades,
      
      // Datos receptor
      receptorTipoDocumento: AFIPService.obtenerCodigoTipoDocumento(cliente.tipoDocumento),
      receptorNumeroDocumento: cliente.numeroDocumento,
      receptorRazonSocial: cliente.razonSocial || `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
      receptorDomicilio: cliente.direccion,
      receptorCondicionIVA: cliente.condicionIVA,
      
      // Fechas
      fecha: new Date(),
      
      // Items agrupados
      items,
      
      // Totales (se calculan automáticamente)
      subtotal: 0,
      descuentoTotal: 0,
      importeNetoGravado: 0,
      importeNoGravado: 0,
      importeExento: 0,
      importeIVA: 0,
      importeOtrosTributos: 0,
      importeTotal: 0,
      detalleIVA: [],
      
      // Datos AFIP
      datosAFIP: {
        puntoVenta: EMPRESA.puntoVenta
      },
      
      // Observaciones
      observaciones: `Factura generada desde ${ventas.length} venta(s): ${ventas.map(v => v.numeroVenta).join(', ')}`,
      
      // Otros
      concepto: 1,
      monedaId: 'PES',
      cotizacionMoneda: 1,
      usuarioCreador: username
    });

    await factura.save();

    res.status(201).json({
      message: `Factura creada exitosamente desde ${ventas.length} venta(s)`,
      factura,
      ventasAgrupadas: ventas.length
    });
  } catch (error: any) {
    console.error('Error al crear factura desde ventas:', error);
    res.status(500).json({ 
      error: 'Error al crear factura', 
      detalle: error.message 
    });
  }
};

/**
 * Crear factura manual (sin venta previa)
 */
export const crearFacturaManual = async (req: Request, res: Response) => {
  try {
    const username = (req as any).user?.username || 'sistema';
    const { 
      clienteId, 
      tipoComprobante, 
      items, 
      concepto,
      fechaServicioDesde,
      fechaServicioHasta,
      observaciones 
    } = req.body;

    // Obtener configuración de empresa
    const EMPRESA = getEmpresaData();

    // Validar que los datos de la empresa estén configurados
    if (!EMPRESA.cuit || !EMPRESA.razonSocial || !EMPRESA.domicilio) {
      return res.status(500).json({ 
        error: 'Configuración de empresa incompleta',
        detalle: 'Faltan variables de entorno: EMPRESA_CUIT, EMPRESA_RAZON_SOCIAL o EMPRESA_DOMICILIO'
      });
    }

    // Validar datos requeridos
    if (!clienteId || !items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Cliente y items son requeridos' 
      });
    }

    // Buscar cliente
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Crear factura
    const factura = new Factura({
      clienteId: cliente._id,
      tipoComprobante: tipoComprobante || AFIPService.determinarTipoFactura(
        EMPRESA.condicionIVA,
        cliente.condicionIVA
      ),
      estado: 'borrador',
      
      // Datos emisor
      emisorCUIT: EMPRESA.cuit,
      emisorRazonSocial: EMPRESA.razonSocial,
      emisorDomicilio: EMPRESA.domicilio,
      emisorCondicionIVA: EMPRESA.condicionIVA,
      emisorIngresosBrutos: EMPRESA.ingresosBrutos,
      emisorInicioActividades: EMPRESA.inicioActividades,
      
      // Datos receptor
      receptorTipoDocumento: AFIPService.obtenerCodigoTipoDocumento(cliente.tipoDocumento),
      receptorNumeroDocumento: cliente.numeroDocumento,
      receptorRazonSocial: cliente.razonSocial || `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
      receptorDomicilio: cliente.direccion,
      receptorCondicionIVA: cliente.condicionIVA,
      
      // Fechas
      fecha: new Date(),
      fechaServicioDesde: fechaServicioDesde ? new Date(fechaServicioDesde) : undefined,
      fechaServicioHasta: fechaServicioHasta ? new Date(fechaServicioHasta) : undefined,
      
      // Items
      items,
      
      // Totales se calculan automáticamente
      subtotal: 0,
      descuentoTotal: 0,
      importeNetoGravado: 0,
      importeNoGravado: 0,
      importeExento: 0,
      importeIVA: 0,
      importeOtrosTributos: 0,
      importeTotal: 0,
      detalleIVA: [],
      
      // Datos AFIP
      datosAFIP: {
        puntoVenta: EMPRESA.puntoVenta
      },
      
      // Otros
      concepto: concepto || 1,
      monedaId: 'PES',
      cotizacionMoneda: 1,
      observaciones,
      usuarioCreador: username
    });

    await factura.save();

    res.status(201).json({
      message: 'Factura creada exitosamente (borrador)',
      factura
    });
  } catch (error: any) {
    console.error('Error al crear factura manual:', error);
    res.status(500).json({ 
      error: 'Error al crear factura', 
      detalle: error.message 
    });
  }
};

/**
 * Autorizar factura en AFIP (solicitar CAE)
 */
export const autorizarFactura = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar factura
    const factura = await Factura.findById(id);
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    // Verificar que esté en borrador
    if (factura.estado !== 'borrador') {
      return res.status(400).json({ 
        error: `La factura ya está en estado: ${factura.estado}` 
      });
    }

    // Validar factura antes de enviar
    const validacion = AFIPService.validarFactura(factura);
    if (!validacion.valido) {
      return res.status(400).json({ 
        error: 'Factura inválida', 
        errores: validacion.errores 
      });
    }

    // Crear servicio AFIP
    const afipService = new AFIPService(getAfipConfig());

    // Solicitar CAE
    const resultado = await afipService.solicitarCAE(factura);

    if (resultado.resultado === 'A') {
      // Actualizar factura con datos de AFIP
      factura.datosAFIP.cae = resultado.cae;
      factura.datosAFIP.fechaVencimientoCAE = resultado.fechaVencimientoCAE;
      factura.datosAFIP.numeroComprobante = resultado.numeroComprobante;
      factura.datosAFIP.numeroSecuencial = parseInt(resultado.numeroComprobante.split('-')[1] || '0');
      factura.datosAFIP.fechaAutorizacion = new Date();
      factura.datosAFIP.resultado = 'A';
      if (resultado.observaciones) {
        factura.datosAFIP.observacionesAFIP = resultado.observaciones;
      }
      
      // Generar código de barras
      factura.datosAFIP.codigoBarras = AFIPService.generarCodigoBarras(
        factura.emisorCUIT,
        TIPO_COMPROBANTE_CODIGO[factura.tipoComprobante],
        factura.datosAFIP.puntoVenta,
        resultado.cae,
        resultado.fechaVencimientoCAE
      );
      
      factura.estado = 'autorizada';
      await factura.save();

      // Marcar ventas relacionadas como facturadas
      const ventasIds = factura.ventasRelacionadas && factura.ventasRelacionadas.length > 0 
        ? factura.ventasRelacionadas 
        : factura.ventaId ? [factura.ventaId] : [];
      
      if (ventasIds.length > 0) {
        await Venta.updateMany(
          { _id: { $in: ventasIds } },
          { 
            $set: { 
              facturada: true,
              facturaId: factura._id
            }
          }
        );
      }

      res.json({
        message: 'Factura autorizada exitosamente por AFIP',
        factura,
        cae: resultado.cae,
        numeroComprobante: resultado.numeroComprobante,
        ventasActualizadas: ventasIds.length
      });
    } else {
      // Rechazada por AFIP
      factura.estado = 'rechazada';
      factura.datosAFIP.resultado = 'R';
      if (resultado.errores) {
        factura.datosAFIP.motivoRechazo = resultado.errores.join(', ');
      }
      await factura.save();

      res.status(400).json({
        error: 'Factura rechazada por AFIP',
        errores: resultado.errores,
        factura
      });
    }
  } catch (error: any) {
    console.error('Error al autorizar factura:', error);
    res.status(500).json({ 
      error: 'Error al autorizar factura', 
      detalle: error.message 
    });
  }
};

/**
 * Listar facturas
 */
export const listarFacturas = async (req: Request, res: Response) => {
  try {
    const { 
      estado, 
      clienteId, 
      desde, 
      hasta, 
      tipoComprobante,
      page = 1,
      limit = 50
    } = req.query;

    const filtro: any = {};

    if (estado) filtro.estado = estado;
    if (clienteId) filtro.clienteId = clienteId;
    if (tipoComprobante) filtro.tipoComprobante = tipoComprobante;
    
    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = new Date(desde as string);
      if (hasta) filtro.fecha.$lte = new Date(hasta as string);
    }

    const facturas = await Factura.find(filtro)
      .populate('clienteId', 'nombre apellido razonSocial numeroDocumento')
      .populate('ventaId', 'numeroVenta')
      .sort({ fecha: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Factura.countDocuments(filtro);

    res.json({
      facturas,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    console.error('Error al listar facturas:', error);
    res.status(500).json({ 
      error: 'Error al listar facturas', 
      detalle: error.message 
    });
  }
};

/**
 * Obtener factura por ID
 */
export const obtenerFactura = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const factura = await Factura.findById(id)
      .populate('clienteId')
      .populate('ventaId');

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    res.json(factura);
  } catch (error: any) {
    console.error('Error al obtener factura:', error);
    res.status(500).json({ 
      error: 'Error al obtener factura', 
      detalle: error.message 
    });
  }
};

/**
 * Anular factura
 */
export const anularFactura = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
      return res.status(400).json({ error: 'El motivo de anulación es requerido' });
    }

    const factura = await Factura.findById(id);
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    if (factura.estado === 'anulada') {
      return res.status(400).json({ error: 'La factura ya está anulada' });
    }

    factura.estado = 'anulada';
    factura.fechaAnulacion = new Date();
    factura.motivoAnulacion = motivo;
    await factura.save();

    res.json({
      message: 'Factura anulada exitosamente',
      factura
    });
  } catch (error: any) {
    console.error('Error al anular factura:', error);
    res.status(500).json({ 
      error: 'Error al anular factura', 
      detalle: error.message 
    });
  }
};

/**
 * Verificar CAE en AFIP
 */
export const verificarCAE = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const factura = await Factura.findById(id);
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    if (!factura.datosAFIP.cae) {
      return res.status(400).json({ error: 'La factura no tiene CAE' });
    }

    const afipService = new AFIPService(getAfipConfig());
    
    const valido = await afipService.verificarCAE(
      factura.datosAFIP.cae,
      TIPO_COMPROBANTE_CODIGO[factura.tipoComprobante],
      factura.datosAFIP.puntoVenta,
      factura.datosAFIP.numeroSecuencial!
    );

    res.json({
      valido,
      cae: factura.datosAFIP.cae,
      numeroComprobante: factura.datosAFIP.numeroComprobante,
      fechaVencimiento: factura.datosAFIP.fechaVencimientoCAE
    });
  } catch (error: any) {
    console.error('Error al verificar CAE:', error);
    res.status(500).json({ 
      error: 'Error al verificar CAE', 
      detalle: error.message 
    });
  }
};

/**
 * Obtener puntos de venta habilitados en AFIP
 */
export const obtenerPuntosVenta = async (req: Request, res: Response) => {
  try {
    const afipService = new AFIPService(getAfipConfig());
    const puntosVenta = await afipService.obtenerPuntosVenta();

    res.json({ puntosVenta });
  } catch (error: any) {
    console.error('Error al obtener puntos de venta:', error);
    res.status(500).json({ 
      error: 'Error al obtener puntos de venta', 
      detalle: error.message 
    });
  }
};

import { TIPO_COMPROBANTE_CODIGO } from '../models/Factura.js';
