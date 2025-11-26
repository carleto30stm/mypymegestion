/**
 * NotaCreditoService.ts
 * Servicio para gestión robusta de Notas de Crédito
 * 
 * Responsabilidades:
 * - Emitir NC en AFIP
 * - Guardar NC como documento Factura
 * - Actualizar factura original con referencia
 * - Impactar cuenta corriente
 * - Impactar venta relacionada (si existe)
 * - Registrar auditoría
 */

import mongoose from 'mongoose';
import type { ClientSession } from 'mongoose';
import Factura, { TIPO_COMPROBANTE_CODIGO } from '../models/Factura.js';
import type { IFactura, TipoComprobante } from '../models/Factura.js';
import Cliente from '../models/Cliente.js';
import Venta from '../models/Venta.js';
import MovimientoCuentaCorriente from '../models/MovimientoCuentaCorriente.js';
import { AFIPServiceSOAP } from './afip/AFIPServiceSOAP.js';

// Configuración de AFIP
const getAfipConfig = () => ({
  cuit: process.env.AFIP_CUIT || '',
  certPath: process.env.AFIP_CERT_PATH || './certs/cert.crt',
  keyPath: process.env.AFIP_KEY_PATH || './certs/private.key',
  production: process.env.AFIP_PRODUCTION === 'true',
  puntoVenta: parseInt(process.env.AFIP_PUNTO_VENTA || '1'),
  razonSocial: process.env.EMPRESA_RAZON_SOCIAL || ''
});

// Interfaces
export interface EmitirNCParams {
  facturaOriginalId: string;
  motivo: string;
  importeParcial?: number;  // Si no se pasa, es NC total
  usuario: string;
  ip?: string;
}

export interface ResultadoNC {
  success: boolean;
  notaCredito?: IFactura;
  cae?: string;
  fechaVencimientoCAE?: Date | string;
  numeroComprobante?: string;
  error?: string;
  erroresAFIP?: string[];
}

/**
 * Clase principal del servicio de Notas de Crédito
 */
export class NotaCreditoService {
  
  /**
   * Emitir Nota de Crédito completa
   * - Valida que se pueda emitir
   * - Emite en AFIP
   * - Guarda NC como Factura
   * - Actualiza factura original
   * - Impacta cuenta corriente
   * - Impacta venta si existe
   */
  async emitirNotaCredito(params: EmitirNCParams): Promise<ResultadoNC> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { facturaOriginalId, motivo, importeParcial, usuario, ip } = params;
      
      // 1. Obtener y validar factura original
      const facturaOriginal = await Factura.findById(facturaOriginalId).session(session);
      if (!facturaOriginal) {
        throw new Error('Factura no encontrada');
      }
      
      // 2. Validar que puede emitir NC
      const importe = importeParcial || facturaOriginal.importeTotal;
      const validacion = (facturaOriginal as any).puedeEmitirNC(importe);
      if (!validacion.puede) {
        throw new Error(validacion.motivo);
      }
      
      // 3. Obtener cliente
      const cliente = await Cliente.findById(facturaOriginal.clienteId).session(session);
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }
      
      // 4. Determinar tipo de NC según factura original
      const tipoNC = this.obtenerTipoNC(facturaOriginal.tipoComprobante);
      
      // 4.1. VALIDAR COMPATIBILIDAD NC-IVA (Error 10217 de AFIP)
      const validacionIVA = this.validarCompatibilidadNCCondicionIVA(
        tipoNC,
        facturaOriginal.receptorCondicionIVA || 'Consumidor Final',
        facturaOriginal.receptorCondicionIVACodigo
      );
      
      if (!validacionIVA.valido) {
        console.error('❌ Validación NC-IVA fallida:', validacionIVA.error);
        await session.abortTransaction();
        return {
          success: false,
          error: validacionIVA.error || 'Error de compatibilidad NC-IVA',
          erroresAFIP: [validacionIVA.error || 'Error de compatibilidad NC-IVA']
        };
      }
      
      // 5. Preparar datos para AFIP
      const datosNC = this.prepararDatosAFIP(facturaOriginal, cliente, importe, tipoNC);
      
      console.log('\n📋 ========== EMISIÓN NC VÍA SERVICIO ==========');
      console.log('📋 Factura original:', facturaOriginal.datosAFIP.numeroComprobante);
      console.log('📋 Importe:', importe, importeParcial ? '(PARCIAL)' : '(TOTAL)');
      console.log('📋 Tipo NC:', tipoNC);
      console.log('📋 Condición IVA receptor:', facturaOriginal.receptorCondicionIVA, 
                  '(código:', facturaOriginal.receptorCondicionIVACodigo, ')');
      
      // 6. Emitir NC en AFIP
      const afipService = new AFIPServiceSOAP(getAfipConfig());
      const resultadoAFIP = await afipService.emitirNotaCredito(datosNC, motivo);
      
      if (!resultadoAFIP.aprobado) {
        console.error('❌ NC rechazada por AFIP:', resultadoAFIP.errores);
        await session.abortTransaction();
        return {
          success: false,
          error: 'AFIP rechazó la Nota de Crédito',
          erroresAFIP: resultadoAFIP.errores || []
        };
      }
      
      console.log('✅ NC aprobada por AFIP. CAE:', resultadoAFIP.cae);
      
      // 7. Crear documento NC en BD
      const notaCredito = await this.crearDocumentoNC(
        facturaOriginal,
        cliente,
        tipoNC,
        importe,
        motivo,
        resultadoAFIP,
        usuario,
        session
      );
      
      // 8. Actualizar factura original
      const esParcial = importeParcial !== undefined && importeParcial < facturaOriginal.importeTotal;
      await this.actualizarFacturaOriginal(
        facturaOriginal,
        notaCredito,
        importe,
        esParcial ? 'parcial' : 'total',
        motivo,
        usuario,
        ip,
        session
      );
      
      // 9. Impactar cuenta corriente
      await this.impactarCuentaCorriente(
        facturaOriginal.clienteId,
        notaCredito,
        importe,
        usuario,
        session
      );
      
      // 10. Impactar venta si existe y es anulación total
      if (!esParcial && facturaOriginal.ventaId) {
        await this.impactarVenta(
          facturaOriginal.ventaId,
          motivo,
          usuario,
          session
        );
      }
      
      await session.commitTransaction();
      
      console.log('✅ NC procesada completamente');
      console.log('   Número:', notaCredito.datosAFIP.numeroComprobante);
      console.log('========== FIN EMISIÓN NC ==========\n');
      
      return {
        success: true,
        notaCredito,
        cae: resultadoAFIP.cae,
        fechaVencimientoCAE: resultadoAFIP.fechaVencimientoCAE,
        numeroComprobante: String(resultadoAFIP.numeroComprobante)
      };
      
    } catch (error: any) {
      await session.abortTransaction();
      console.error('❌ Error en NotaCreditoService:', error.message);
      return {
        success: false,
        error: error.message
      };
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Obtener tipo de NC según tipo de factura original
   */
  private obtenerTipoNC(tipoFactura: TipoComprobante): TipoComprobante {
    const mapeo: Record<string, TipoComprobante> = {
      'FACTURA_A': 'NOTA_CREDITO_A',
      'FACTURA_B': 'NOTA_CREDITO_B',
      'FACTURA_C': 'NOTA_CREDITO_C'
    };
    return mapeo[tipoFactura] || 'NOTA_CREDITO_B';
  }
  
  /**
   * Validar compatibilidad entre tipo NC y condición IVA del receptor
   * Error 10217 de AFIP: NC tipo A solo puede emitirse a Responsable Inscripto
   */
  private validarCompatibilidadNCCondicionIVA(
    tipoNC: TipoComprobante,
    condicionIVA: string | number,
    condicionIVACodigo?: number
  ): { valido: boolean; error?: string } {
    // Obtener código numérico de condición IVA
    let codigoIVA = condicionIVACodigo;
    if (!codigoIVA) {
      // Convertir desde string si es necesario
      const condicionStr = String(condicionIVA).toUpperCase();
      const mapeo: Record<string, number> = {
        'RESPONSABLE_INSCRIPTO': 1,
        'RESPONSABLE_INSCRITO': 1,
        'RESPONSABLE_NO_INSCRIPTO': 2,
        'EXENTO': 4,
        'CONSUMIDOR_FINAL': 5,
        'MONOTRIBUTO': 6,
        'RESPONSABLE_MONOTRIBUTO': 6,
        'MONOTRIBUTISTA': 6,
        'NO_CATEGORIZADO': 7,
        'PROVEEDOR_EXTERIOR': 8,
        'CLIENTE_EXTERIOR': 9,
        'IVA_LIBERADO': 10,
        'MONOTRIBUTISTA_SOCIAL': 13,
        'IVA_NO_ALCANZADO': 15,
      };
      codigoIVA = mapeo[condicionStr.replace(/\s+/g, '_')] || 5; // Default: Consumidor Final
    }
    
    console.log('🔍 Validando compatibilidad NC-IVA:', { tipoNC, condicionIVA, codigoIVA });
    
    // NC tipo A (código 3) SOLO puede emitirse a Responsable Inscripto (código 1)
    if (tipoNC === 'NOTA_CREDITO_A') {
      if (codigoIVA !== 1) {
        return {
          valido: false,
          error: `Error 10217: No se puede emitir NC tipo A con crédito fiscal discriminado a un receptor que no es Responsable Inscripto. ` +
                 `Condición IVA del receptor: ${condicionIVA} (código ${codigoIVA}). ` +
                 `Solo Responsable Inscripto (código 1) puede recibir NC tipo A.`
        };
      }
    }
    
    return { valido: true };
  }
  
  /**
   * Preparar datos para enviar a AFIP
   */
  private prepararDatosAFIP(
    facturaOriginal: IFactura,
    cliente: any,
    importe: number,
    tipoNC: TipoComprobante
  ) {
    // Determinar tipo de documento
    const numeroDocLimpio = cliente.numeroDocumento.replace(/[^0-9]/g, '');
    const esCUIT = numeroDocLimpio.length === 11 && 
                   ['20', '23', '27', '30', '33'].includes(numeroDocLimpio.substring(0, 2));
    
    const esNCTipoA = tipoNC === 'NOTA_CREDITO_A';
    const esNCTipoC = tipoNC === 'NOTA_CREDITO_C';
    const tipoDocumentoNC = esNCTipoA ? 80 : (esCUIT ? 80 : 96);
    
    // Calcular proporción para NC parciales
    const proporcion = importe / facturaOriginal.importeTotal;
    
    // IMPORTANTE: Convertir tipo de NC a formato esperado por AFIPServiceSOAP
    const tipoNCParaAFIP = this.convertirTipoNCParaAFIP(tipoNC);
    
    // El comprobante asociado debe ser el tipo de la FACTURA ORIGINAL
    const tipoFacturaOriginal = this.convertirTipoALetra(facturaOriginal.tipoComprobante);
    
    // Para NC tipo A, la condición IVA DEBE ser Responsable Inscripto
    // Para NC tipo C, no se discrimina IVA
    let condicionIVAParaNC = facturaOriginal.receptorCondicionIVA || 'Consumidor Final';
    if (esNCTipoA) {
      // Para NC-A, forzar Responsable Inscripto ya que eso es lo que implica Factura A
      condicionIVAParaNC = 'Responsable Inscripto';
    }
    
    console.log('📋 Preparando datos NC para AFIP:');
    console.log('   - Tipo NC a emitir:', tipoNC, '→', tipoNCParaAFIP);
    console.log('   - Tipo factura asociada:', facturaOriginal.tipoComprobante, '→', tipoFacturaOriginal);
    console.log('   - Condición IVA guardada:', facturaOriginal.receptorCondicionIVA);
    console.log('   - Condición IVA a usar en NC:', condicionIVAParaNC);
    console.log('   - Importe:', importe, '(proporción:', proporcion, ')');
    console.log('   - IVA a discriminar:', !esNCTipoC);
    
    // Calcular importes de IVA para NC tipo A y B
    const tieneIVA = facturaOriginal.detalleIVA && facturaOriginal.detalleIVA.length > 0 && !esNCTipoC;
    const importeIVACalculado = tieneIVA 
      ? facturaOriginal.detalleIVA.reduce((sum: number, i: any) => sum + (i.importe * proporcion), 0)
      : 0;
    
    console.log('   - IVA calculado:', importeIVACalculado);
    
    const datos: any = {
      puntoVenta: facturaOriginal.datosAFIP.puntoVenta,
      tipoComprobante: tipoNCParaAFIP,
      concepto: (facturaOriginal.concepto === 1 ? 'productos' : 
                facturaOriginal.concepto === 2 ? 'servicios' : 'productos_servicios') as 'productos' | 'servicios' | 'productos_servicios',
      
      cliente: {
        tipoDocumento: String(tipoDocumentoNC),
        numeroDocumento: numeroDocLimpio,
        condicionIVA: condicionIVAParaNC
      },
      
      fecha: new Date(),
      
      importes: {
        total: Math.round(importe * 100) / 100,
        noGravado: Math.round((facturaOriginal.importeNoGravado || 0) * proporcion * 100) / 100,
        exento: Math.round((facturaOriginal.importeExento || 0) * proporcion * 100) / 100,
        neto: Math.round(facturaOriginal.importeNetoGravado * proporcion * 100) / 100,
        // Para NC tipo C, IVA debe ser 0
        iva: esNCTipoC ? 0 : Math.round((facturaOriginal.importeIVA || 0) * proporcion * 100) / 100,
        tributos: Math.round((facturaOriginal.importeOtrosTributos || 0) * proporcion * 100) / 100
      },
      
      // Comprobante asociado - tipo de la FACTURA original
      comprobantesAsociados: [{
        tipo: tipoFacturaOriginal,
        puntoVenta: facturaOriginal.datosAFIP.puntoVenta,
        numero: facturaOriginal.datosAFIP.numeroSecuencial || 0,
        cuit: process.env.AFIP_CUIT || '',
        fecha: facturaOriginal.fecha
      }]
    };
    
    // IVA proporcional - OBLIGATORIO para NC tipo A y B, NO incluir para C
    if (tieneIVA) {
      datos.iva = facturaOriginal.detalleIVA.map((i: any) => ({
        alicuota: i.alicuota,
        baseImponible: Math.round(i.baseImponible * proporcion * 100) / 100,
        importe: Math.round(i.importe * proporcion * 100) / 100
      }));
      console.log('   - Detalle IVA:', JSON.stringify(datos.iva));
    }
    
    return datos;
  }
  
  /**
   * Convertir tipo de NC al formato esperado por AFIPServiceSOAP
   * Acepta 'NOTA_CREDITO_A/B/C' y convierte al formato que entiende el servicio
   */
  private convertirTipoNCParaAFIP(tipoNC: TipoComprobante): string {
    // AFIPServiceSOAP.convertirTipoComprobante acepta tanto 
    // 'NOTA_CREDITO_A' como 'A_NC'
    return tipoNC; // El servicio ya maneja ambos formatos
  }
  
  /**
   * Convertir tipo comprobante a letra para el servicio AFIP
   * Usado para el comprobante ASOCIADO (factura original)
   */
  private convertirTipoALetra(tipo: TipoComprobante): string {
    if (tipo.includes('_A')) return 'A';
    if (tipo.includes('_B')) return 'B';
    if (tipo.includes('_C')) return 'C';
    return 'B';
  }
  
  /**
   * Formatea el número de comprobante al formato estándar "00001-00000123"
   */
  private formatearNumeroComprobante(puntoVenta: number, numeroSecuencial: number | string): string {
    const pv = String(puntoVenta).padStart(5, '0');
    const num = String(numeroSecuencial).replace(/\D/g, '').padStart(8, '0');
    return `${pv}-${num}`;
  }
  
  /**
   * Crear documento NC en la base de datos
   */
  private async crearDocumentoNC(
    facturaOriginal: IFactura,
    cliente: any,
    tipoNC: TipoComprobante,
    importe: number,
    motivo: string,
    resultadoAFIP: any,
    usuario: string,
    session: ClientSession
  ): Promise<IFactura> {
    
    const proporcion = importe / facturaOriginal.importeTotal;
    
    // Crear items proporcionales
    const itemsNC = facturaOriginal.items.map(item => ({
      codigo: item.codigo,
      descripcion: `[NC] ${item.descripcion}`,
      cantidad: item.cantidad * proporcion,
      unidadMedida: item.unidadMedida,
      precioUnitario: item.precioUnitario,
      importeBruto: item.importeBruto * proporcion,
      importeDescuento: item.importeDescuento * proporcion,
      importeNeto: item.importeNeto * proporcion,
      alicuotaIVA: item.alicuotaIVA,
      importeIVA: item.importeIVA * proporcion,
      importeTotal: item.importeTotal * proporcion
    }));
    
    const notaCreditoData = {
      // Relaciones
      clienteId: facturaOriginal.clienteId,
      ventaId: facturaOriginal.ventaId,
      ventasRelacionadas: facturaOriginal.ventasRelacionadas || [],
      
      // Tipo y estado
      tipoComprobante: tipoNC,
      estado: 'autorizada' as const,
      
      // Referencia a factura original
      facturaOriginal: {
        facturaId: facturaOriginal._id,
        numeroComprobante: facturaOriginal.datosAFIP.numeroComprobante || '',
        cae: facturaOriginal.datosAFIP.cae || '',
        importe: facturaOriginal.importeTotal
      },
      
      // Datos del emisor (mismos que factura original)
      emisorCUIT: facturaOriginal.emisorCUIT,
      emisorRazonSocial: facturaOriginal.emisorRazonSocial,
      emisorDomicilio: facturaOriginal.emisorDomicilio,
      emisorCondicionIVA: facturaOriginal.emisorCondicionIVA,
      emisorIngresosBrutos: facturaOriginal.emisorIngresosBrutos,
      emisorInicioActividades: facturaOriginal.emisorInicioActividades,
      
      // Datos del receptor
      receptorTipoDocumento: facturaOriginal.receptorTipoDocumento,
      receptorNumeroDocumento: facturaOriginal.receptorNumeroDocumento,
      receptorRazonSocial: facturaOriginal.receptorRazonSocial,
      receptorDomicilio: facturaOriginal.receptorDomicilio,
      receptorCondicionIVA: facturaOriginal.receptorCondicionIVA,
      receptorCondicionIVACodigo: facturaOriginal.receptorCondicionIVACodigo,
      
      // Fechas
      fecha: new Date(),
      
      // Items
      items: itemsNC,
      
      // Totales proporcionales
      subtotal: facturaOriginal.subtotal * proporcion,
      descuentoTotal: facturaOriginal.descuentoTotal * proporcion,
      importeNetoGravado: facturaOriginal.importeNetoGravado * proporcion,
      importeNoGravado: (facturaOriginal.importeNoGravado || 0) * proporcion,
      importeExento: (facturaOriginal.importeExento || 0) * proporcion,
      importeIVA: facturaOriginal.importeIVA * proporcion,
      importeOtrosTributos: (facturaOriginal.importeOtrosTributos || 0) * proporcion,
      importeTotal: importe,
      
      // Detalle IVA proporcional
      detalleIVA: facturaOriginal.detalleIVA.map(d => ({
        alicuota: d.alicuota,
        baseImponible: d.baseImponible * proporcion,
        importe: d.importe * proporcion
      })),
      
      // Datos AFIP
      datosAFIP: {
        cae: resultadoAFIP.cae,
        fechaVencimientoCAE: resultadoAFIP.fechaVencimientoCAE ? new Date(resultadoAFIP.fechaVencimientoCAE) : undefined,
        numeroComprobante: this.formatearNumeroComprobante(facturaOriginal.datosAFIP.puntoVenta, resultadoAFIP.numeroComprobante),
        puntoVenta: facturaOriginal.datosAFIP.puntoVenta,
        numeroSecuencial: typeof resultadoAFIP.numeroComprobante === 'number' 
          ? resultadoAFIP.numeroComprobante 
          : parseInt(String(resultadoAFIP.numeroComprobante).replace(/\D/g, '') || '0'),
        fechaAutorizacion: new Date(),
        resultado: 'A'
      },
      
      // Comprobante asociado
      comprobanteAsociado: {
        tipo: TIPO_COMPROBANTE_CODIGO[facturaOriginal.tipoComprobante],
        puntoVenta: facturaOriginal.datosAFIP.puntoVenta,
        numero: facturaOriginal.datosAFIP.numeroSecuencial || 0
      },
      
      // Otros
      observaciones: `Nota de Crédito por: ${motivo}. Factura original: ${facturaOriginal.datosAFIP.numeroComprobante}`,
      concepto: facturaOriginal.concepto,
      monedaId: facturaOriginal.monedaId,
      cotizacionMoneda: facturaOriginal.cotizacionMoneda,
      usuarioCreador: usuario,
      
      // NC no tiene NC emitidas
      notasCreditoEmitidas: [],
      totalNotasCreditoEmitidas: 0,
      
      // Historial inicial
      historialEstados: [{
        estado: 'autorizada' as const,
        fecha: new Date(),
        usuario,
        motivo: `NC emitida. ${motivo}`
      }]
    };
    
    const [notaCredito] = await Factura.create([notaCreditoData], { session });
    return notaCredito as IFactura;
  }
  
  /**
   * Actualizar factura original con referencia a NC
   */
  private async actualizarFacturaOriginal(
    facturaOriginal: IFactura,
    notaCredito: IFactura,
    importe: number,
    tipo: 'total' | 'parcial',
    motivo: string,
    usuario: string,
    ip: string | undefined,
    session: ClientSession
  ): Promise<void> {
    
    // Agregar referencia a NC
    (facturaOriginal as any).agregarNotaCredito({
      facturaId: notaCredito._id,
      cae: notaCredito.datosAFIP.cae!,
      numeroComprobante: notaCredito.datosAFIP.numeroComprobante!,
      importe,
      tipo,
      motivo
    });
    
    // Si es NC total, marcar factura como anulada
    if (tipo === 'total') {
      facturaOriginal.estado = 'anulada';
      facturaOriginal.fechaAnulacion = new Date();
      facturaOriginal.motivoAnulacion = motivo;
    }
    
    // Registrar en historial
    (facturaOriginal as any).registrarCambioEstado(
      tipo === 'total' ? 'anulada' : facturaOriginal.estado,
      usuario,
      `NC ${tipo} emitida: ${notaCredito.datosAFIP.numeroComprobante}. ${motivo}`,
      ip,
      { notaCreditoId: notaCredito._id, importe }
    );
    
    await facturaOriginal.save({ session });
  }
  
  /**
   * Impactar cuenta corriente del cliente
   */
  private async impactarCuentaCorriente(
    clienteId: mongoose.Types.ObjectId,
    notaCredito: IFactura,
    importe: number,
    usuario: string,
    session: ClientSession
  ): Promise<void> {
    
    // Obtener saldo actual
    const ultimoMovimiento = await MovimientoCuentaCorriente.findOne({
      clienteId,
      anulado: false
    }).sort({ fecha: -1, createdAt: -1 }).session(session);
    
    const saldoAnterior = ultimoMovimiento?.saldo || 0;
    const nuevoSaldo = saldoAnterior - importe; // NC reduce deuda (va al HABER)
    
    // Crear movimiento - creadoPor guarda username (string), no ObjectId
    await MovimientoCuentaCorriente.create([{
      clienteId,
      fecha: new Date(),
      tipo: 'nota_credito',
      documentoTipo: 'NC',
      documentoNumero: notaCredito.datosAFIP.numeroComprobante,
      documentoId: notaCredito._id,
      concepto: `Nota de Crédito ${notaCredito.datosAFIP.numeroComprobante}`,
      observaciones: notaCredito.observaciones,
      debe: 0,
      haber: importe, // NC va al HABER (reduce deuda)
      saldo: nuevoSaldo,
      creadoPor: usuario, // Guardar username directamente
      anulado: false
    }], { session });
    
    // Actualizar saldo del cliente
    const cliente = await Cliente.findById(clienteId).session(session);
    if (cliente) {
      cliente.saldoCuenta = nuevoSaldo;
      
      // Actualizar estado si corresponde
      if (cliente.estado === 'moroso' && nuevoSaldo <= cliente.limiteCredito) {
        cliente.estado = 'activo';
      }
      
      await cliente.save({ session });
    }
    
    console.log('💰 Cuenta corriente actualizada. Nuevo saldo:', nuevoSaldo);
  }
  
  /**
   * Impactar venta relacionada (anulación)
   */
  private async impactarVenta(
    ventaId: mongoose.Types.ObjectId,
    motivo: string,
    usuario: string,
    session: ClientSession
  ): Promise<void> {
    
    const venta = await Venta.findById(ventaId).session(session);
    if (!venta) {
      console.warn('⚠️ Venta no encontrada para actualizar:', ventaId);
      return;
    }
    
    venta.estado = 'anulada';
    venta.fechaAnulacion = new Date();
    venta.motivoAnulacion = motivo;
    venta.usuarioAnulacion = usuario;
    
    await venta.save({ session });
    
    console.log('📦 Venta actualizada a anulada:', venta.numeroVenta);
  }
  
  /**
   * Obtener NC emitidas para una factura
   */
  async obtenerNCDeFactura(facturaId: string): Promise<IFactura[]> {
    return Factura.find({
      'facturaOriginal.facturaId': new mongoose.Types.ObjectId(facturaId),
      tipoComprobante: { $in: ['NOTA_CREDITO_A', 'NOTA_CREDITO_B', 'NOTA_CREDITO_C'] }
    }).sort({ fecha: -1 });
  }
  
  /**
   * Calcular saldo pendiente de anulación
   */
  async calcularSaldoPendiente(facturaId: string): Promise<{
    importeTotal: number;
    totalNC: number;
    saldoPendiente: number;
    notasCredito: number;
  }> {
    const factura = await Factura.findById(facturaId);
    if (!factura) {
      throw new Error('Factura no encontrada');
    }
    
    return {
      importeTotal: factura.importeTotal,
      totalNC: factura.totalNotasCreditoEmitidas || 0,
      saldoPendiente: (factura as any).getSaldoPendienteAnulacion(),
      notasCredito: factura.notasCreditoEmitidas?.length || 0
    };
  }
}

// Exportar instancia singleton
export const notaCreditoService = new NotaCreditoService();
