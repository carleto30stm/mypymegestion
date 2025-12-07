import type { Request, Response } from 'express';
import Factura from '../models/Factura.js';
import type { IFactura, TipoComprobante } from '../models/Factura.js';
import Venta from '../models/Venta.js';
import Cliente from '../models/Cliente.js';
import AFIPServiceSOAP, { type DatosFactura } from '../services/afip/AFIPServiceSOAP.js';
import { notaCreditoService } from '../services/NotaCreditoService.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Helper para obtener configuración de AFIP (lee variables al momento de la llamada)
const getAfipConfig = (): {
  cuit: string;
  certPath: string;
  keyPath: string;
  production: boolean;
  taFolder?: string;
  puntoVenta: number;
  razonSocial: string;
} => {
  let certPath: string;
  let keyPath: string;

  // Si hay variables de entorno con certificados, crear archivos temporales
  if (process.env.AFIP_CERT && process.env.AFIP_KEY) {
    // Usar directorio temporal del sistema (compatible con Vercel/Railway)
    const tempDir = os.tmpdir();
    certPath = path.join(tempDir, `afip_cert_${process.env.AFIP_CUIT || 'default'}.crt`);
    keyPath = path.join(tempDir, `afip_key_${process.env.AFIP_CUIT || 'default'}.key`);

    try {
      // Decodificar y escribir SIEMPRE (para asegurar contenido fresco y válido)
      // Sanitizar contenido: reemplazar \n literales, eliminar \r, y reducir múltiples saltos de línea
      const cleanContent = (content: string) => {
        return content
          .replace(/\\n/g, '\n')
          .replace(/\r/g, '')
          .replace(/\n+/g, '\n')
          .trim();
      };

      const cert = cleanContent(process.env.AFIP_CERT);
      const key = cleanContent(process.env.AFIP_KEY);

      fs.writeFileSync(certPath, cert, 'utf8');
      fs.writeFileSync(keyPath, key, 'utf8');

      // Verificar tamaño para debugging
      const certStats = fs.statSync(certPath);
      const keyStats = fs.statSync(keyPath);
      console.log(`✅ Certificados temporales creados/actualizados:`);
      console.log(`   - Cert: ${certPath} (${certStats.size} bytes)`);
      console.log(`   - Key: ${keyPath} (${keyStats.size} bytes)`);
    } catch (error) {
      console.error('❌ Error al crear certificados temporales:', error);
      throw new Error('No se pudieron crear certificados temporales AFIP');
    }
  } else {
    // Usar archivos locales con rutas absolutas
    certPath = path.resolve(process.env.AFIP_CERT_PATH || './certs/cert.crt');
    keyPath = path.resolve(process.env.AFIP_KEY_PATH || './certs/private.key');
  }

  const config: any = {
    cuit: process.env.AFIP_CUIT || '',
    certPath,
    keyPath,
    production: process.env.AFIP_PRODUCTION === 'true',
    puntoVenta: parseInt(process.env.AFIP_PUNTO_VENTA || '1'),
    razonSocial: process.env.EMPRESA_RAZON_SOCIAL || ''
  };

  // Solo incluir taFolder si está definido
  if (process.env.AFIP_TA_FOLDER) {
    config.taFolder = process.env.AFIP_TA_FOLDER;
  }

  return config;
};

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
 * Convierte código de tipo de documento AFIP a string
 */
const convertirCodigoTipoDocumento = (codigo: number): string => {
  const mapa: Record<number, string> = {
    80: 'CUIT',
    86: 'CUIL',
    96: 'DNI',
    94: 'PASAPORTE',
    99: 'SIN_IDENTIFICAR'
  };
  return mapa[codigo] || 'DNI';
};

/**
 * Convierte código de concepto a string
 */
const convertirConcepto = (codigo: number): 'productos' | 'servicios' | 'productos_servicios' => {
  switch (codigo) {
    case 1: return 'productos';
    case 2: return 'servicios';
    case 3: return 'productos_servicios';
    default: return 'productos';
  }
};

/**
 * Convierte TipoComprobante del modelo a formato de letra para AFIP Service (A, B, C, A_NC, etc.)
 */
const convertirTipoComprobanteALetra = (tipo: TipoComprobante | undefined): string => {
  if (!tipo) {
    throw new Error('Tipo de comprobante no definido');
  }

  const mapa: Record<TipoComprobante, string> = {
    'FACTURA_A': 'A',
    'FACTURA_B': 'B',
    'FACTURA_C': 'C',
    'NOTA_CREDITO_A': 'A_NC',
    'NOTA_CREDITO_B': 'B_NC',
    'NOTA_CREDITO_C': 'C_NC',
    'NOTA_DEBITO_A': 'A_ND',
    'NOTA_DEBITO_B': 'B_ND',
    'NOTA_DEBITO_C': 'C_ND'
  };

  const resultado = mapa[tipo];
  if (!resultado) {
    throw new Error(`Tipo de comprobante no reconocido: ${tipo}`);
  }

  return resultado;
};

/**
 * Convierte letra de tipo de comprobante (A, B, C) a enum TipoComprobante del modelo
 */
const convertirLetraATipoComprobante = (letra: string, tipo: 'factura' | 'nota_debito' | 'nota_credito' = 'factura'): TipoComprobante => {
  if (tipo === 'factura') {
    switch (letra.toUpperCase()) {
      case 'A': return 'FACTURA_A';
      case 'B': return 'FACTURA_B';
      case 'C': return 'FACTURA_C';
      default: throw new Error(`Tipo de factura no reconocido: ${letra}`);
    }
  } else if (tipo === 'nota_debito') {
    switch (letra.toUpperCase()) {
      case 'A': case 'A_ND': return 'NOTA_DEBITO_A';
      case 'B': case 'B_ND': return 'NOTA_DEBITO_B';
      case 'C': case 'C_ND': return 'NOTA_DEBITO_C';
      default: throw new Error(`Tipo de nota débito no reconocido: ${letra}`);
    }
  } else {
    switch (letra.toUpperCase()) {
      case 'A': case 'A_NC': return 'NOTA_CREDITO_A';
      case 'B': case 'B_NC': return 'NOTA_CREDITO_B';
      case 'C': case 'C_NC': return 'NOTA_CREDITO_C';
      default: throw new Error(`Tipo de nota crédito no reconocido: ${letra}`);
    }
  }
};

/**
 * Convierte código numérico AFIP a letra (para comprobantes asociados)
 */
const convertirCodigoALetra = (codigo: number): string => {
  // Normalizar el código a número (por si viene como string desde Mongoose)
  const codigoNum = typeof codigo === 'string' ? parseInt(codigo, 10) : codigo;

  const mapa: Record<number, string> = {
    1: 'A',     // FACTURA_A
    6: 'B',     // FACTURA_B
    11: 'C',    // FACTURA_C
    2: 'A_ND',  // NOTA_DEBITO_A
    7: 'B_ND',  // NOTA_DEBITO_B
    12: 'C_ND', // NOTA_DEBITO_C
    3: 'A_NC',  // NOTA_CREDITO_A
    8: 'B_NC',  // NOTA_CREDITO_B
    13: 'C_NC'  // NOTA_CREDITO_C
  };

  const resultado = mapa[codigoNum];

  if (!resultado) {
    throw new Error(`Código de comprobante no reconocido: ${codigo} (normalizado: ${codigoNum})`);
  }

  return resultado;
};

/**
 * Adaptador: Convierte IFactura (modelo Mongoose) a DatosFactura (formato SOAP)
 */
const adaptarFacturaParaSOAP = (factura: IFactura): DatosFactura => {
  console.log('🔍 [DEBUG] receptorCondicionIVA:', factura.receptorCondicionIVA);
  console.log('🔍 [DEBUG] receptorCondicionIVACodigo:', factura.receptorCondicionIVACodigo);
  console.log('🔍 [DEBUG] receptorTipoDocumento:', factura.receptorTipoDocumento);
  console.log('🔍 [DEBUG] tipoComprobante:', factura.tipoComprobante);

  // IMPORTANTE: Si tenemos el código numérico, usarlo directamente
  // Si no, intentar convertir la descripción (fallback para facturas viejas)
  const condicionIVA = factura.receptorCondicionIVACodigo
    ? factura.receptorCondicionIVACodigo.toString() // AFIP espera string del código
    : factura.receptorCondicionIVA; // Fallback a descripción (se convierte después)

  console.log('🔍 [DEBUG] condicionIVA a enviar:', condicionIVA);

  return {
    puntoVenta: factura.datosAFIP.puntoVenta,
    tipoComprobante: convertirTipoComprobanteALetra(factura.tipoComprobante),
    concepto: convertirConcepto(factura.concepto),

    cliente: {
      tipoDocumento: convertirCodigoTipoDocumento(factura.receptorTipoDocumento),
      numeroDocumento: factura.receptorNumeroDocumento,
      condicionIVA: condicionIVA // ✅ Usar código numérico si existe, sino descripción
    },

    fecha: factura.fecha,

    importes: {
      total: factura.importeTotal,
      noGravado: factura.importeNoGravado,
      exento: factura.importeExento,
      neto: factura.importeNetoGravado,
      iva: factura.importeIVA,
      tributos: factura.importeOtrosTributos
    },

    iva: factura.detalleIVA.map(detalle => ({
      alicuota: detalle.alicuota,
      baseImponible: detalle.baseImponible,
      importe: detalle.importe
    })),

    ...(factura.otrosTributos && factura.otrosTributos.length > 0 && {
      tributos: factura.otrosTributos.map(trib => ({
        id: trib.codigo,
        descripcion: trib.descripcion,
        baseImponible: trib.baseImponible,
        alicuota: trib.alicuota,
        importe: trib.importe
      }))
    }),

    ...(factura.fechaServicioDesde && { fechaServicioDesde: factura.fechaServicioDesde }),
    ...(factura.fechaServicioHasta && { fechaServicioHasta: factura.fechaServicioHasta }),
    ...(factura.fechaVencimientoPago && { fechaVencimientoPago: factura.fechaVencimientoPago }),

    ...(factura.comprobanteAsociado && factura.comprobanteAsociado.tipo && {
      comprobantesAsociados: [{
        tipo: convertirCodigoALetra(factura.comprobanteAsociado.tipo),
        puntoVenta: factura.comprobanteAsociado.puntoVenta,
        numero: factura.comprobanteAsociado.numero
      }]
    })
  };
};


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

    // Validar consistencia entre tipo de documento y condición IVA
    if ((cliente.tipoDocumento === 'CUIT' || cliente.tipoDocumento === 'CUIL') &&
      cliente.condicionIVA === 'Consumidor Final') {
      console.warn(`⚠️  ADVERTENCIA: Cliente ${cliente.numeroDocumento} tiene CUIT/CUIL pero está marcado como Consumidor Final`);
      console.warn(`⚠️  Esto puede causar rechazo en AFIP. Considere actualizar condicionIVA a 'Responsable Inscripto' o 'Monotributista'`);
    }

    // NUEVO ENFOQUE: Consultar tipo de factura desde AFIP
    console.log('\n🚀 ========== USANDO CONSULTA AFIP PARA DETERMINAR TIPO FACTURA ==========');

    const afipConfig: any = {
      cuit: EMPRESA.cuit,
      certPath: process.env.AFIP_CERT_PATH || '',
      keyPath: process.env.AFIP_KEY_PATH || '',
      production: process.env.AFIP_PRODUCTION === 'true',
      puntoVenta: EMPRESA.puntoVenta,
      razonSocial: EMPRESA.razonSocial
    };

    // Solo incluir taFolder si está definido
    if (process.env.AFIP_TA_FOLDER) {
      afipConfig.taFolder = process.env.AFIP_TA_FOLDER;
    }

    const afipService = new AFIPServiceSOAP(afipConfig);

    const resultadoAFIP = await afipService.determinarTipoFacturaDesdeAFIP(
      cliente.numeroDocumento,
      EMPRESA.condicionIVA
    );

    console.log('📋 Resultado consulta AFIP:');
    console.log('  - Tipo factura:', resultadoAFIP.tipoFactura);
    console.log('  - Condición IVA:', resultadoAFIP.descripcionCondicion, `(código ${resultadoAFIP.condicionIVA})`);
    console.log('  - Discrimina IVA:', resultadoAFIP.discriminaIVA);
    console.log('  - Usar DNI en lugar de CUIT:', resultadoAFIP.usarDNIEnLugarDeCUIT);
    console.log('========== FIN CONSULTA AFIP ==========\n');

    const tipoComprobanteLetra = resultadoAFIP.tipoFactura;
    const tipoComprobante = convertirLetraATipoComprobante(tipoComprobanteLetra);

    // CRÍTICO: Determinar tipo de documento para AFIP
    // Si AFIP indica usar DNI en lugar de CUIT, cambiar el tipo de documento
    let tipoDocumentoParaAFIP = AFIPServiceSOAP.convertirTipoDocumento(cliente.tipoDocumento);
    if (resultadoAFIP.usarDNIEnLugarDeCUIT && tipoDocumentoParaAFIP === 80) {
      // El cliente tiene CUIT pero no está en padrones de AFIP
      // Usar DNI (96) para evitar error "DocNro no se encuentra registrado en padrones"
      console.log('⚠️ Cambiando tipo documento de CUIT (80) a DNI (96) según indicación de AFIP');
      tipoDocumentoParaAFIP = 96; // DNI
    }

    // Determinar si el comprobante discrimina IVA
    // CRÍTICO: Respetar venta.aplicaIVA (decisión del usuario) Y resultado de AFIP
    const discriminaIVA = venta.aplicaIVA && resultadoAFIP.discriminaIVA;
    console.log('💰 [DEBUG] Discrimina IVA final:', discriminaIVA);

    // Informar al usuario el tipo de factura que se va a emitir
    console.log('\n🎯 ========== TIPO DE FACTURA DETERMINADO ==========');
    console.log('📄 Se creará una FACTURA tipo', tipoComprobanteLetra);
    console.log('👤 Cliente:', cliente.razonSocial || `${cliente.nombre} ${cliente.apellido || ''}`.trim());
    console.log('📋 CUIT/DNI:', cliente.numeroDocumento);
    console.log('💼 Condición IVA detectada:', resultadoAFIP.descripcionCondicion);
    console.log('💰 Discriminará IVA:', discriminaIVA ? 'SÍ' : 'NO');
    console.log('========== FIN TIPO FACTURA ==========\n');

    // Alícuota IVA: usar la de la venta original
    // Si la venta tiene IVA, es 21%, sino 0
    const alicuotaIVA = venta.aplicaIVA ? 21 : 0;
    console.log('💰 [DEBUG] Alícuota IVA:', alicuotaIVA);

    // CRÍTICO: Calcular IVA proporcional por item basado en el IVA total de la venta
    const totalVentaSinIVA = venta.total - venta.iva;

    // Convertir items de venta a items de factura
    const items = venta.items.map(item => {
      // El item.total ya tiene descuentos aplicados pero NO incluye IVA
      const importeNeto = item.total;

      // Calcular IVA proporcional de este item respecto al total
      // Proporción: (importeNeto / totalVentaSinIVA) * ivaTotal
      const ivaProporcion = totalVentaSinIVA > 0
        ? (importeNeto / totalVentaSinIVA) * venta.iva
        : 0;

      const importeIVA = discriminaIVA ? ivaProporcion : 0;

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

      // Datos receptor - USAR CONDICIÓN IVA DETECTADA POR AFIP
      receptorTipoDocumento: tipoDocumentoParaAFIP, // ✅ Tipo documento ajustado según padrón AFIP
      receptorNumeroDocumento: cliente.numeroDocumento,
      receptorRazonSocial: cliente.razonSocial || `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
      receptorDomicilio: cliente.direccion,
      receptorCondicionIVA: resultadoAFIP.descripcionCondicion, // ✅ Condición detectada por AFIP (string descriptivo)
      receptorCondicionIVACodigo: resultadoAFIP.condicionIVA, // ✅ Código numérico para AFIP

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

    // Determinar tipo de factura consultando AFIP
    // NO usar condición IVA guardada - el cliente puede haber cambiado
    const afipConfig: any = {
      cuit: EMPRESA.cuit,
      certPath: process.env.AFIP_CERT_PATH || '',
      keyPath: process.env.AFIP_KEY_PATH || '',
      production: process.env.AFIP_PRODUCTION === 'true',
      puntoVenta: EMPRESA.puntoVenta,
      razonSocial: EMPRESA.razonSocial
    };
    if (process.env.AFIP_TA_FOLDER) {
      afipConfig.taFolder = process.env.AFIP_TA_FOLDER;
    }
    
    const afipService = new AFIPServiceSOAP(afipConfig);
    const resultadoAFIP = await afipService.determinarTipoFacturaDesdeAFIP(
      cliente.numeroDocumento,
      EMPRESA.condicionIVA
    );

    console.log('📋 Resultado consulta AFIP (ventas agrupadas):');
    console.log('  - Tipo factura:', resultadoAFIP.tipoFactura);
    console.log('  - Condición IVA:', resultadoAFIP.descripcionCondicion);
    console.log('  - Usar DNI en lugar de CUIT:', resultadoAFIP.usarDNIEnLugarDeCUIT);

    const tipoComprobanteLetra = resultadoAFIP.tipoFactura;
    const tipoComprobante = convertirLetraATipoComprobante(tipoComprobanteLetra);

    // Determinar tipo de documento para AFIP
    let tipoDocumentoParaAFIP = AFIPServiceSOAP.convertirTipoDocumento(cliente.tipoDocumento);
    if (resultadoAFIP.usarDNIEnLugarDeCUIT && tipoDocumentoParaAFIP === 80) {
      console.log('⚠️ Cambiando tipo documento de CUIT (80) a DNI (96) según indicación de AFIP');
      tipoDocumentoParaAFIP = 96;
    }

    const discriminaIVA = resultadoAFIP.discriminaIVA && tipoComprobante === 'FACTURA_A';
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
        ? AFIPServiceSOAP.calcularIVA(item.importeNeto, alicuotaIVA)
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

      // Datos receptor - USAR CONDICIÓN IVA DETECTADA POR AFIP
      receptorTipoDocumento: tipoDocumentoParaAFIP, // ✅ Tipo documento ajustado según padrón AFIP
      receptorNumeroDocumento: cliente.numeroDocumento,
      receptorRazonSocial: cliente.razonSocial || `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
      receptorDomicilio: cliente.direccion,
      receptorCondicionIVA: resultadoAFIP.descripcionCondicion, // ✅ Condición detectada por AFIP
      receptorCondicionIVACodigo: resultadoAFIP.condicionIVA, // ✅ Código numérico para AFIP

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

    // Consultar AFIP para determinar tipo de factura y tipo de documento
    // NO usar condición IVA guardada - el cliente puede haber cambiado
    const afipConfig: any = {
      cuit: EMPRESA.cuit,
      certPath: process.env.AFIP_CERT_PATH || '',
      keyPath: process.env.AFIP_KEY_PATH || '',
      production: process.env.AFIP_PRODUCTION === 'true',
      puntoVenta: EMPRESA.puntoVenta,
      razonSocial: EMPRESA.razonSocial
    };
    if (process.env.AFIP_TA_FOLDER) {
      afipConfig.taFolder = process.env.AFIP_TA_FOLDER;
    }
    
    const afipService = new AFIPServiceSOAP(afipConfig);
    const resultadoAFIP = await afipService.determinarTipoFacturaDesdeAFIP(
      cliente.numeroDocumento,
      EMPRESA.condicionIVA
    );

    console.log('📋 Resultado consulta AFIP (factura manual):');
    console.log('  - Tipo factura:', resultadoAFIP.tipoFactura);
    console.log('  - Condición IVA:', resultadoAFIP.descripcionCondicion);
    console.log('  - Usar DNI en lugar de CUIT:', resultadoAFIP.usarDNIEnLugarDeCUIT);

    // Determinar tipo de documento para AFIP
    let tipoDocumentoParaAFIP = AFIPServiceSOAP.convertirTipoDocumento(cliente.tipoDocumento);
    if (resultadoAFIP.usarDNIEnLugarDeCUIT && tipoDocumentoParaAFIP === 80) {
      console.log('⚠️ Cambiando tipo documento de CUIT (80) a DNI (96) según indicación de AFIP');
      tipoDocumentoParaAFIP = 96;
    }

    // Determinar tipo de comprobante (usar el proporcionado o el detectado por AFIP)
    const tipoComprobanteResuelto = tipoComprobante
      ? convertirLetraATipoComprobante(tipoComprobante as string)
      : convertirLetraATipoComprobante(resultadoAFIP.tipoFactura);

    // Crear factura
    const factura = new Factura({
      clienteId: cliente._id,
      tipoComprobante: tipoComprobanteResuelto,
      estado: 'borrador',

      // Datos emisor
      emisorCUIT: EMPRESA.cuit,
      emisorRazonSocial: EMPRESA.razonSocial,
      emisorDomicilio: EMPRESA.domicilio,
      emisorCondicionIVA: EMPRESA.condicionIVA,
      emisorIngresosBrutos: EMPRESA.ingresosBrutos,
      emisorInicioActividades: EMPRESA.inicioActividades,

      // Datos receptor - USAR CONDICIÓN IVA DETECTADA POR AFIP
      receptorTipoDocumento: tipoDocumentoParaAFIP, // ✅ Tipo documento ajustado según padrón AFIP
      receptorNumeroDocumento: cliente.numeroDocumento,
      receptorRazonSocial: cliente.razonSocial || `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
      receptorDomicilio: cliente.direccion,
      receptorCondicionIVA: resultadoAFIP.descripcionCondicion, // ✅ Condición detectada por AFIP
      receptorCondicionIVACodigo: resultadoAFIP.condicionIVA, // ✅ Código numérico para AFIP

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

    // Validar que tenga tipo de comprobante
    if (!factura.tipoComprobante) {
      return res.status(400).json({
        error: 'La factura no tiene tipo de comprobante definido',
        detalle: 'Verifique que el campo tipoComprobante esté presente en la factura'
      });
    }

    // Validar factura antes de enviar
    const datosParaValidar = adaptarFacturaParaSOAP(factura);
    const validacion = AFIPServiceSOAP.validarFactura(datosParaValidar);
    if (!validacion.valido) {
      return res.status(400).json({
        error: 'Factura inválida',
        errores: validacion.errores
      });
    }

    // Crear servicio AFIP
    const afipService = new AFIPServiceSOAP(getAfipConfig());

    // Adaptar factura al formato SOAP y solicitar CAE
    const datosFactura = adaptarFacturaParaSOAP(factura);
    const resultado = await afipService.solicitarCAE(datosFactura);

    if (resultado.aprobado) {
      // Actualizar factura con datos de AFIP
      factura.datosAFIP.cae = resultado.cae;
      factura.datosAFIP.fechaVencimientoCAE = resultado.fechaVencimientoCAE;
      factura.datosAFIP.numeroSecuencial = resultado.numeroComprobante;
      factura.datosAFIP.numeroComprobante = `${String(factura.datosAFIP.puntoVenta).padStart(5, '0')}-${String(resultado.numeroComprobante).padStart(8, '0')}`;
      factura.datosAFIP.fechaAutorizacion = new Date();
      factura.datosAFIP.resultado = 'A';
      if (resultado.observaciones) {
        factura.datosAFIP.observacionesAFIP = resultado.observaciones;
      }

      // Generar código de barras
      factura.datosAFIP.codigoBarras = AFIPServiceSOAP.generarCodigoBarras(
        factura.emisorCUIT,
        convertirTipoComprobanteALetra(factura.tipoComprobante),
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
        ventasActualizadas: ventasIds.length,
        ...(resultado.observaciones && resultado.observaciones.length > 0 && {
          observaciones: resultado.observaciones,
          advertencia: 'Factura autorizada con observaciones informativas de AFIP'
        })
      });
    } else {
      // Rechazada por AFIP
      factura.estado = 'rechazada';
      factura.datosAFIP.resultado = 'R';
      if (resultado.errores) {
        factura.datosAFIP.motivoRechazo = resultado.errores.join(', ');
      }
      await factura.save();
      //TODO: Manejar factura rechazada mostrando mensaje de error FeDetResp Observaciones Obs.1.Msg
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
 * Resetear factura rechazada a borrador (para reintentar autorización)
 */
export const resetearFacturaRechazada = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;

    // Validar que el ID exista
    if (!id) {
      return res.status(400).json({ error: 'ID de factura requerido' });
    }

    // Limpiar ID (remover llaves, espacios, comillas)
    id = id.replace(/[{}"'\s]/g, '').trim();

    // Validar formato de ObjectId (24 caracteres hexadecimales)
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        error: 'ID de factura inválido',
        idRecibido: req.params.id
      });
    }

    const factura = await Factura.findById(id);
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    // Solo se pueden resetear facturas rechazadas
    if (factura.estado !== 'rechazada') {
      return res.status(400).json({
        error: 'Solo se pueden resetear facturas rechazadas',
        estadoActual: factura.estado
      });
    }

    // Limpiar datos de AFIP del intento fallido
    factura.estado = 'borrador';

    // Usar $unset para eliminar campos opcionales
    await Factura.updateOne(
      { _id: id },
      {
        $set: { estado: 'borrador' },
        $unset: {
          'datosAFIP.resultado': '',
          'datosAFIP.motivoRechazo': '',
          'datosAFIP.observacionesAFIP': ''
        }
      }
    );

    // Recargar factura actualizada
    const facturaActualizada = await Factura.findById(id);

    res.json({
      message: 'Factura reseteada a borrador. Puede intentar autorizarla nuevamente.',
      factura: facturaActualizada
    });
  } catch (error: any) {
    console.error('Error al resetear factura:', error);
    res.status(500).json({
      error: 'Error al resetear factura',
      detalle: error.message
    });
  }
};

/**
 * Anular factura
 * Si la factura fue autorizada en AFIP, emite una Nota de Crédito
 * REFACTORIZADO: Usa NotaCreditoService para manejo completo
 */
export const anularFactura = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motivo, emitirNC = true } = req.body;
    const usuario = (req as any).user?.username || 'sistema';
    const ip = req.ip || req.socket?.remoteAddress;

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

    // Verificar si ya tiene NC emitidas por el total
    const saldoPendiente = (factura as any).getSaldoPendienteAnulacion?.() ?? factura.importeTotal;
    if (saldoPendiente <= 0) {
      return res.status(400).json({ 
        error: 'Ya se emitieron Notas de Crédito por el total de esta factura' 
      });
    }

    let resultado = null;

    // Si la factura está autorizada en AFIP, emitir Nota de Crédito
    if (factura.estado === 'autorizada' && factura.datosAFIP.cae && emitirNC) {
      console.log('\n📋 ========== ANULACIÓN CON NC (VÍA SERVICIO) ==========');
      console.log('📋 Factura:', factura.datosAFIP.numeroComprobante);
      console.log('📋 Motivo:', motivo);
      console.log('📋 Usuario:', usuario);

      // Usar el nuevo servicio de NC
      resultado = await notaCreditoService.emitirNotaCredito({
        facturaOriginalId: id as string,
        motivo,
        usuario,
        ...(ip && { ip })
      });

      if (!resultado.success) {
        console.error('❌ Error al emitir NC:', resultado.error);
        return res.status(400).json({
          error: resultado.error || 'Error al emitir Nota de Crédito',
          erroresAFIP: resultado.erroresAFIP,
          mensaje: 'La factura no se anuló porque AFIP rechazó la Nota de Crédito'
        });
      }

      console.log('✅ Anulación completada vía servicio');
      console.log('========== FIN ANULACIÓN ==========\n');

      // La factura ya fue actualizada por el servicio, recargar
      const facturaActualizada = await Factura.findById(id);

      res.json({
        message: 'Factura anulada exitosamente',
        factura: facturaActualizada,
        notaCredito: {
          id: resultado.notaCredito?._id,
          cae: resultado.cae,
          fechaVencimientoCAE: resultado.fechaVencimientoCAE,
          numeroComprobante: resultado.numeroComprobante
        }
      });
    } else {
      // Factura no autorizada o sin CAE - anular solo en BD
      console.log('📋 Anulando factura sin NC (no autorizada en AFIP)');
      
      factura.estado = 'anulada';
      factura.fechaAnulacion = new Date();
      factura.motivoAnulacion = motivo;
      
      // Registrar en historial si el método existe
      if (typeof (factura as any).registrarCambioEstado === 'function') {
        (factura as any).registrarCambioEstado('anulada', usuario, motivo, ip);
      }
      
      await factura.save();

      res.json({
        message: 'Factura anulada exitosamente (sin NC)',
        factura
      });
    }
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

    const afipService = new AFIPServiceSOAP(getAfipConfig());

    const valido = await afipService.verificarCAE(
      factura.datosAFIP.puntoVenta,
      convertirTipoComprobanteALetra(factura.tipoComprobante),
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
    const afipService = new AFIPServiceSOAP(getAfipConfig());
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

/**
 * Emitir Nota de Crédito manualmente
 * Permite emitir NC sin anular la factura (para correcciones parciales)
 * REFACTORIZADO: Usa NotaCreditoService
 */
export const emitirNotaCredito = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID de la factura original
    const { motivo, importeParcial } = req.body;
    const usuario = (req as any).user?.username || 'sistema';
    const ip = req.ip || req.socket?.remoteAddress;

    if (!motivo) {
      return res.status(400).json({ error: 'El motivo es requerido' });
    }

    // Validar que la factura existe y puede emitir NC
    const factura = await Factura.findById(id);
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    // Validar usando el método del modelo
    if (typeof (factura as any).puedeEmitirNC === 'function') {
      const validacion = (factura as any).puedeEmitirNC(importeParcial);
      if (!validacion.puede) {
        return res.status(400).json({ error: validacion.motivo });
      }
    } else {
      // Validación básica si el método no existe
      if (factura.estado !== 'autorizada' || !factura.datosAFIP.cae) {
        return res.status(400).json({ 
          error: 'Solo se pueden emitir NC para facturas autorizadas en AFIP' 
        });
      }
    }

    console.log('\n📋 ========== EMISIÓN MANUAL NC (VÍA SERVICIO) ==========');
    console.log('📋 Factura:', factura.datosAFIP.numeroComprobante);
    console.log('📋 Importe:', importeParcial || 'TOTAL');
    console.log('📋 Motivo:', motivo);

    // Usar el servicio de NC
    const resultado = await notaCreditoService.emitirNotaCredito({
      facturaOriginalId: id as string,
      motivo,
      importeParcial,
      usuario,
      ...(ip && { ip })
    });

    if (!resultado.success) {
      console.error('❌ Error al emitir NC:', resultado.error);
      return res.status(400).json({
        error: resultado.error || 'Error al emitir Nota de Crédito',
        erroresAFIP: resultado.erroresAFIP
      });
    }

    console.log('✅ NC emitida exitosamente');
    console.log('========== FIN EMISIÓN NC ==========\n');

    // Calcular si es parcial
    const importeNC = importeParcial || factura.importeTotal;
    const esParcial = importeParcial !== undefined && importeParcial < factura.importeTotal;

    res.json({
      message: 'Nota de Crédito emitida exitosamente',
      notaCredito: {
        id: resultado.notaCredito?._id,
        cae: resultado.cae,
        fechaVencimientoCAE: resultado.fechaVencimientoCAE,
        numeroComprobante: resultado.numeroComprobante,
        importe: importeNC,
        tipo: esParcial ? 'parcial' : 'total'
      },
      facturaOriginal: {
        id: factura._id,
        numeroComprobante: factura.datosAFIP.numeroComprobante,
        saldoPendiente: (factura as any).getSaldoPendienteAnulacion?.() || 0
      }
    });
  } catch (error: any) {
    console.error('Error al emitir Nota de Crédito:', error);
    res.status(500).json({
      error: 'Error al emitir Nota de Crédito',
      detalle: error.message
    });
  }
};

/**
 * Obtener Notas de Crédito emitidas para una factura
 */
export const obtenerNotasCreditoDeFactura = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID de factura requerido' });
    }

    const factura = await Factura.findById(id);
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    // Obtener NC usando el servicio
    const notasCredito = await notaCreditoService.obtenerNCDeFactura(id);

    // Obtener resumen de saldo
    const resumen = await notaCreditoService.calcularSaldoPendiente(id);

    res.json({
      factura: {
        id: factura._id,
        numeroComprobante: factura.datosAFIP.numeroComprobante,
        importeTotal: factura.importeTotal,
        estado: factura.estado
      },
      resumen: {
        importeOriginal: resumen.importeTotal,
        totalNotasCredito: resumen.totalNC,
        saldoPendiente: resumen.saldoPendiente,
        cantidadNC: resumen.notasCredito,
        puedeEmitirMasNC: resumen.saldoPendiente > 0
      },
      notasCredito: notasCredito.map(nc => ({
        id: nc._id,
        tipoComprobante: nc.tipoComprobante,
        numeroComprobante: nc.datosAFIP.numeroComprobante,
        cae: nc.datosAFIP.cae,
        fecha: nc.fecha,
        importeTotal: nc.importeTotal,
        estado: nc.estado,
        observaciones: nc.observaciones
      })),
      // También incluir las referencias embebidas en la factura
      notasCreditoEmitidas: factura.notasCreditoEmitidas || []
    });
  } catch (error: any) {
    console.error('Error al obtener NC de factura:', error);
    res.status(500).json({
      error: 'Error al obtener Notas de Crédito',
      detalle: error.message
    });
  }
};

/**
 * Obtener saldo pendiente de anulación de una factura
 */
export const obtenerSaldoPendienteFactura = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID de factura requerido' });
    }

    const resumen = await notaCreditoService.calcularSaldoPendiente(id);

    res.json({
      facturaId: id,
      ...resumen,
      puedeEmitirNC: resumen.saldoPendiente > 0
    });
  } catch (error: any) {
    console.error('Error al obtener saldo pendiente:', error);
    res.status(500).json({
      error: 'Error al obtener saldo pendiente',
      detalle: error.message
    });
  }
};

/**
 * Listar todas las Notas de Crédito del sistema
 */
export const listarNotasCredito = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      clienteId, 
      desde, 
      hasta,
      estado 
    } = req.query;

    const filtros: any = {
      tipoComprobante: { $in: ['NOTA_CREDITO_A', 'NOTA_CREDITO_B', 'NOTA_CREDITO_C'] }
    };

    if (clienteId) {
      filtros.clienteId = clienteId;
    }

    if (estado) {
      filtros.estado = estado;
    }

    if (desde || hasta) {
      filtros.fecha = {};
      if (desde) filtros.fecha.$gte = new Date(desde as string);
      if (hasta) filtros.fecha.$lte = new Date(hasta as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [notasCredito, total] = await Promise.all([
      Factura.find(filtros)
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('clienteId', 'razonSocial nombre apellido numeroDocumento')
        .populate('facturaOriginal.facturaId', 'datosAFIP.numeroComprobante')
        .lean(),
      Factura.countDocuments(filtros)
    ]);

    res.json({
      data: notasCredito.map(nc => ({
        id: nc._id,
        tipoComprobante: nc.tipoComprobante,
        numeroComprobante: nc.datosAFIP?.numeroComprobante,
        cae: nc.datosAFIP?.cae,
        fecha: nc.fecha,
        importeTotal: nc.importeTotal,
        estado: nc.estado,
        cliente: nc.clienteId,
        facturaOriginal: nc.facturaOriginal,
        observaciones: nc.observaciones
      })),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error al listar NC:', error);
    res.status(500).json({
      error: 'Error al listar Notas de Crédito',
      detalle: error.message
    });
  }
};

import { TIPO_COMPROBANTE_CODIGO } from '../models/Factura.js';
