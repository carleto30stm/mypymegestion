/**
 * AFIP Service SOAP - Facade Unificado
 * 
 * Este servicio es un facade que unifica WSAA y WSFE, proporcionando
 * una API compatible con el AFIPService original (SDK) para facilitar
 * la migración sin cambios masivos en los controladores.
 * 
 * @author Sistema myGestor
 * @version 2.0.0 - SOAP Directo (reemplazo completo de SDK comercial)
 */

import AFIPWSAAService from './AFIPWSAAService.js';
import AFIPWSFEService, { 
  TIPO_COMPROBANTE,
  ALICUOTA_IVA,
  TIPO_DOCUMENTO,
  CONDICION_IVA,
  type ComprobanteDatos,
  type ResultadoCAE,
  type WSFEConfig
} from './AFIPWSFEService.js';
import AFIPPadronService from './AFIPPadronService.js';

export interface AFIPConfig {
  cuit: string;
  certPath: string;
  keyPath: string;
  production: boolean;
  taFolder?: string;
  puntoVenta: number;
  razonSocial: string;
}

export interface DatosFactura {
  puntoVenta: number;
  tipoComprobante: string; // 'A', 'B', 'C'
  concepto: 'productos' | 'servicios' | 'productos_servicios';
  
  cliente: {
    tipoDocumento: string; // 'CUIT', 'DNI', etc
    numeroDocumento: string;
    condicionIVA: string; // OBLIGATORIO según RG 5616
  };
  
  fecha: Date;
  
  importes: {
    total: number;
    noGravado: number;
    exento: number;
    neto: number;
    iva: number;
    tributos: number;
  };
  
  iva?: Array<{
    alicuota: number; // 21, 10.5, etc
    baseImponible: number;
    importe: number;
  }>;
  
  tributos?: Array<{
    id: number;
    descripcion: string;
    baseImponible: number;
    alicuota: number;
    importe: number;
  }>;
  
  fechaServicioDesde?: Date;
  fechaServicioHasta?: Date;
  fechaVencimientoPago?: Date;
  
  comprobantesAsociados?: Array<{
    tipo: string;
    puntoVenta: number;
    numero: number;
    cuit?: string;    // CUIT del emisor (requerido por AFIP para NC)
    fecha?: Date;     // Fecha del comprobante original
  }>;
}

export interface RespuestaCAE {
  cae: string;
  fechaVencimientoCAE: Date;
  numeroComprobante: number;
  aprobado: boolean;
  observaciones?: string[];
  errores?: string[];
}

export class AFIPServiceSOAP {
  private wsaaService: AFIPWSAAService;
  private wsfeService: AFIPWSFEService;
  private config: AFIPConfig;

  constructor(config: AFIPConfig) {
    this.config = config;
    
    // Inicializar servicios SOAP
    const soapConfig: WSFEConfig = {
      cuit: config.cuit,
      certPath: config.certPath,
      keyPath: config.keyPath,
      production: config.production,
      ...(config.taFolder && { taFolder: config.taFolder })
    };
    
    this.wsaaService = new AFIPWSAAService(soapConfig);
    this.wsfeService = new AFIPWSFEService(soapConfig);
  }

  /**
   * Solicita CAE para una factura
   * API compatible con AFIPService original
   */
  async solicitarCAE(factura: DatosFactura): Promise<RespuestaCAE> {
    // Convertir formato de entrada al formato interno
    const comprobante = this.convertirFacturaAComprobante(factura);
    
    // Solicitar CAE
    const resultado = await this.wsfeService.solicitarCAE(comprobante);
    
    // Convertir respuesta al formato de salida
    return {
      cae: resultado.cae,
      fechaVencimientoCAE: resultado.fechaVencimientoCAE,
      numeroComprobante: resultado.numeroComprobante,
      aprobado: resultado.resultado === 'A',
      ...(resultado.observaciones && { observaciones: resultado.observaciones }),
      ...(resultado.errores && { errores: resultado.errores })
    };
  }

  /**
   * Obtiene el último número de comprobante autorizado
   */
  async obtenerUltimoNumeroComprobante(
    tipoComprobante: string,
    puntoVenta?: number
  ): Promise<number> {
    const ptoVta = puntoVenta || this.config.puntoVenta;
    const tipoComp = AFIPServiceSOAP.convertirTipoComprobante(tipoComprobante);
    
    return await this.wsfeService.obtenerUltimoComprobante(ptoVta, tipoComp);
  }

  /**
   * Verifica un CAE existente
   */
  async verificarCAE(
    puntoVenta: number,
    tipoComprobante: string,
    numeroComprobante: number
  ): Promise<any> {
    const tipoComp = AFIPServiceSOAP.convertirTipoComprobante(tipoComprobante);
    
    return await this.wsfeService.consultarComprobante(
      puntoVenta,
      tipoComp,
      numeroComprobante
    );
  }

  /**
   * Obtiene los puntos de venta habilitados
   */
  async obtenerPuntosVenta(): Promise<Array<{ numero: number; bloqueado: boolean }>> {
    return await this.wsfeService.obtenerPuntosVenta();
  }

  /**
   * Obtiene el estado del servidor AFIP
   */
  async consultarEstadoServidor(): Promise<{
    appServer: string;
    dbServer: string;
    authServer: string;
  }> {
    return await this.wsfeService.consultarEstadoServidor();
  }

  /**
   * Emite una Nota de Crédito para anular/rectificar una factura
   * 
   * @param facturaOriginal - Datos de la factura a anular
   * @param motivo - Motivo de la anulación (opcional, para logs)
   * @returns Resultado con CAE de la Nota de Crédito
   */
  async emitirNotaCredito(
    facturaOriginal: DatosFactura,
    motivo?: string
  ): Promise<RespuestaCAE> {
    console.log('\n📋 ========== EMITIR NOTA DE CRÉDITO ==========');
    if (motivo) {
      console.log('📋 Motivo:', motivo);
    }

    // Determinar tipo de NC según tipo de comprobante recibido
    // Si ya es NC, usarlo directamente. Si es factura, derivar el tipo de NC.
    let tipoNC: string;
    const tipoRecibido = facturaOriginal.tipoComprobante.toUpperCase();
    
    // Si ya es una NC, usar directamente
    if (tipoRecibido.includes('NOTA_CREDITO') || tipoRecibido.includes('_NC')) {
      tipoNC = tipoRecibido.includes('_A') || tipoRecibido === 'NOTA_CREDITO_A' ? 'NOTA_CREDITO_A' :
               tipoRecibido.includes('_B') || tipoRecibido === 'NOTA_CREDITO_B' ? 'NOTA_CREDITO_B' :
               tipoRecibido.includes('_C') || tipoRecibido === 'NOTA_CREDITO_C' ? 'NOTA_CREDITO_C' :
               'NOTA_CREDITO_B';
      console.log('📋 Tipo NC recibido directamente:', tipoNC);
    } else {
      // Derivar NC desde tipo de factura
      switch (tipoRecibido) {
        case 'A':
        case 'FACTURA_A':
          tipoNC = 'NOTA_CREDITO_A';
          break;
        case 'B':
        case 'FACTURA_B':
          tipoNC = 'NOTA_CREDITO_B';
          break;
        case 'C':
        case 'FACTURA_C':
          tipoNC = 'NOTA_CREDITO_C';
          break;
        default:
          throw new Error(`Tipo de comprobante no soportado para NC: ${facturaOriginal.tipoComprobante}`);
      }
      console.log('📋 Tipo NC derivado de factura:', tipoNC);
    }

    console.log('📋 Tipo NC a emitir:', tipoNC);

    // Crear datos de la NC (mismos importes que la factura original, para anulación total)
    const datosNC: DatosFactura = {
      ...facturaOriginal,
      tipoComprobante: tipoNC,
      fecha: new Date(), // Fecha actual para la NC
      // Agregar comprobante asociado (la factura original)
      comprobantesAsociados: facturaOriginal.comprobantesAsociados || []
    };

    console.log('📋 Comprobantes asociados en NC:', datosNC.comprobantesAsociados);

    // Validar que tenga comprobante asociado
    if (!datosNC.comprobantesAsociados || datosNC.comprobantesAsociados.length === 0) {
      throw new Error('La factura original debe tener número de comprobante para emitir NC');
    }

    // Convertir a formato SOAP y emitir
    const comprobanteSOAP = this.convertirFacturaAComprobante(datosNC);
    const resultado = await this.wsfeService.emitirNotaCredito(comprobanteSOAP);

    console.log('========== FIN EMITIR NOTA DE CRÉDITO ==========\n');

    return {
      cae: resultado.cae,
      fechaVencimientoCAE: resultado.fechaVencimientoCAE,
      numeroComprobante: resultado.numeroComprobante,
      aprobado: resultado.resultado === 'A',
      ...(resultado.observaciones && { observaciones: resultado.observaciones }),
      ...(resultado.errores && { errores: resultado.errores })
    };
  }

  /**
   * Emite una Nota de Débito
   * 
   * @param facturaOriginal - Datos de la factura de referencia
   * @param nuevoImporte - Nuevo importe a agregar
   * @param motivo - Motivo del débito
   * @returns Resultado con CAE de la Nota de Débito
   */
  async emitirNotaDebito(
    facturaOriginal: DatosFactura,
    nuevoImporte: number,
    motivo?: string
  ): Promise<RespuestaCAE> {
    console.log('\n📋 ========== EMITIR NOTA DE DÉBITO ==========');
    if (motivo) {
      console.log('📋 Motivo:', motivo);
    }

    // Determinar tipo de ND según tipo de factura original
    let tipoND: string;
    switch (facturaOriginal.tipoComprobante) {
      case 'A':
      case 'FACTURA_A':
        tipoND = 'NOTA_DEBITO_A';
        break;
      case 'B':
      case 'FACTURA_B':
        tipoND = 'NOTA_DEBITO_B';
        break;
      case 'C':
      case 'FACTURA_C':
        tipoND = 'NOTA_DEBITO_C';
        break;
      default:
        throw new Error(`Tipo de comprobante no soportado para ND: ${facturaOriginal.tipoComprobante}`);
    }

    // Crear datos de la ND
    const datosND: DatosFactura = {
      ...facturaOriginal,
      tipoComprobante: tipoND,
      fecha: new Date(),
      importes: {
        ...facturaOriginal.importes,
        total: nuevoImporte
      },
      comprobantesAsociados: facturaOriginal.comprobantesAsociados || []
    };

    // Validar que tenga comprobante asociado
    if (!datosND.comprobantesAsociados || datosND.comprobantesAsociados.length === 0) {
      throw new Error('La factura original debe tener número de comprobante para emitir ND');
    }

    // Convertir a formato SOAP y emitir
    const comprobanteSOAP = this.convertirFacturaAComprobante(datosND);
    const resultado = await this.wsfeService.emitirNotaDebito(comprobanteSOAP);

    console.log('========== FIN EMITIR NOTA DE DÉBITO ==========\n');

    return {
      cae: resultado.cae,
      fechaVencimientoCAE: resultado.fechaVencimientoCAE,
      numeroComprobante: resultado.numeroComprobante,
      aprobado: resultado.resultado === 'A',
      ...(resultado.observaciones && { observaciones: resultado.observaciones }),
      ...(resultado.errores && { errores: resultado.errores })
    };
  }

  /**
   * Limpia cache de tickets de acceso (útil para debugging)
   */
  limpiarCacheTickets(servicio?: string): void {
    this.wsaaService.limpiarCache(servicio);
  }

  // ==================== MÉTODOS ESTÁTICOS (compatibilidad con código existente) ====================

  /**
   * Determina el tipo de factura según condición IVA del cliente
   */
  static determinarTipoFactura(
    empresaCondicionIVA: string,
    clienteCondicionIVA: string,
    tipo: 'factura' | 'nota_debito' | 'nota_credito' = 'factura'
  ): string {
    // Normalizar para comparación
    const empresaNorm = empresaCondicionIVA.toUpperCase().replace(/\s+/g, '_');
    const clienteNorm = clienteCondicionIVA.toUpperCase().replace(/\s+/g, '_');
    
    const empresaRI = empresaNorm === 'RESPONSABLE_INSCRIPTO' || empresaNorm === 'RESPONSABLE_INSCRITO';
    const clienteRI = clienteNorm === 'RESPONSABLE_INSCRIPTO' || clienteNorm === 'RESPONSABLE_INSCRITO';
    const clienteExento = clienteNorm === 'EXENTO';
    const clienteMonotributo = clienteNorm === 'MONOTRIBUTO' || clienteNorm === 'MONOTRIBUTISTA' || clienteNorm === 'RESPONSABLE_MONOTRIBUTO';
    const clienteConsumidorFinal = clienteNorm === 'CONSUMIDOR_FINAL';

    if (!empresaRI) {
      // Empresa no RI solo puede emitir tipo C
      return tipo === 'factura' ? 'C' : 
             tipo === 'nota_debito' ? 'C_ND' : 'C_NC';
    }

    // Empresa RI
    if (clienteRI) {
      return tipo === 'factura' ? 'A' : 
             tipo === 'nota_debito' ? 'A_ND' : 'A_NC';
    }
    
    if (clienteExento) {
      return tipo === 'factura' ? 'B' : 
             tipo === 'nota_debito' ? 'B_ND' : 'B_NC';
    }
    
    if (clienteMonotributo || clienteConsumidorFinal) {
      return tipo === 'factura' ? 'B' : 
             tipo === 'nota_debito' ? 'B_ND' : 'B_NC';
    }

    // Default: tipo B
    return tipo === 'factura' ? 'B' : 
           tipo === 'nota_debito' ? 'B_ND' : 'B_NC';
  }

  /**
   * NUEVO: Determina tipo de factura consultando directamente a AFIP
   * Este método consulta el padrón A4 de AFIP para obtener la condición IVA real
   * NO confía en el valor guardado localmente (el cliente puede haber cambiado de condición)
   */
  async determinarTipoFacturaDesdeAFIP(
    cuitCliente: string,
    empresaCondicionIVA: string
  ): Promise<{ 
    tipoFactura: string; 
    condicionIVA: number; 
    descripcionCondicion: string;
    discriminaIVA: boolean;
    usarDNIEnLugarDeCUIT: boolean;
  }> {
    try {
      console.log('\n🔍 ========== CONSULTA AFIP PARA TIPO FACTURA ==========');
      console.log('🔍 CUIT Cliente:', cuitCliente);
      console.log('🔍 Empresa condición IVA:', empresaCondicionIVA);

      // Crear servicio de padrón con la misma config
      const padronConfig: any = {
        cuit: this.config.cuit,
        certPath: this.config.certPath,
        keyPath: this.config.keyPath,
        production: this.config.production
      };
      
      // Solo incluir taFolder si está definido
      if (this.config.taFolder) {
        padronConfig.taFolder = this.config.taFolder;
      }
      
      const padronService = new AFIPPadronService(padronConfig);

      // Consultar padrón AFIP para obtener condición IVA REAL
      const resultado = await padronService.determinarTipoFactura(
        cuitCliente,
        empresaCondicionIVA
      );

      console.log('📄 Tipo factura determinado:', resultado.tipoFactura);
      console.log('💼 Condición IVA AFIP:', resultado.condicionIVADescripcion, `(código ${resultado.condicionIVA})`);
      console.log('💰 Discrimina IVA:', resultado.discriminaIVA);
      console.log('📋 Usar DNI en lugar de CUIT:', resultado.usarDNIEnLugarDeCUIT);
      console.log('========== FIN CONSULTA AFIP ==========\n');

      return {
        tipoFactura: resultado.tipoFactura,
        condicionIVA: resultado.condicionIVA,
        descripcionCondicion: resultado.condicionIVADescripcion,
        discriminaIVA: resultado.discriminaIVA,
        usarDNIEnLugarDeCUIT: resultado.usarDNIEnLugarDeCUIT
      };
    } catch (error: any) {
      console.error('❌ Error al consultar AFIP para tipo factura:', error.message);
      console.log('⚠️  Usando lógica de fallback segura');
      
      // Fallback seguro: tratar como Consumidor Final y usar DNI
      return {
        tipoFactura: 'B',
        condicionIVA: CONDICION_IVA.CONSUMIDOR_FINAL,
        descripcionCondicion: 'Consumidor Final (fallback)',
        discriminaIVA: true,
        usarDNIEnLugarDeCUIT: true // Seguro para evitar error de padrones
      };
    }
  }

  /**
   * Calcula IVA según alícuota
   */
  static calcularIVA(neto: number, alicuota: number): number {
    return Math.round((neto * alicuota) / 100 * 100) / 100;
  }

  /**
   * Genera código de barras según especificación AFIP
   */
  static generarCodigoBarras(
    cuit: string,
    tipoComprobante: string,
    puntoVenta: number,
    cae: string,
    fechaVencimientoCAE: Date
  ): string {
    const cuitLimpio = cuit.replace(/[^0-9]/g, '');
    const tipoComp = AFIPServiceSOAP.convertirTipoComprobante(tipoComprobante)
      .toString().padStart(3, '0');
    const ptoVta = puntoVenta.toString().padStart(5, '0');
    const caeLimpio = cae.replace(/[^0-9]/g, '');
    
    // Fecha en formato YYYYMMDD
    const fecha = (fechaVencimientoCAE as any).toISOString().split('T')[0].replace(/-/g, '');
    
    // Código sin dígito verificador
    const codigoSinDV = cuitLimpio + tipoComp + ptoVta + caeLimpio + fecha;
    
    // Calcular dígito verificador
    const dv = AFIPServiceSOAP.calcularDigitoVerificador(codigoSinDV);
    
    return codigoSinDV + dv;
  }

  /**
   * Valida estructura básica de una factura antes de enviar a AFIP
   */
  static validarFactura(factura: DatosFactura): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    // Validar punto de venta
    if (!factura.puntoVenta || factura.puntoVenta < 1 || factura.puntoVenta > 99999) {
      errores.push('Punto de venta inválido (debe ser entre 1 y 99999)');
    }

    // Validar tipo de comprobante
    if (!['A', 'B', 'C', 'A_ND', 'B_ND', 'C_ND', 'A_NC', 'B_NC', 'C_NC'].includes(factura.tipoComprobante)) {
      errores.push('Tipo de comprobante inválido');
    }

    // Validar cliente
    if (!factura.cliente?.numeroDocumento) {
      errores.push('Número de documento del cliente requerido');
    }

    // Validar importes
    if (!factura.importes || factura.importes.total <= 0) {
      errores.push('Importe total debe ser mayor a 0');
    }

    // Validar IVA para factura tipo A
    if (factura.tipoComprobante.startsWith('A') && (!factura.iva || factura.iva.length === 0)) {
      errores.push('Factura tipo A requiere detalle de IVA');
    }

    // Validar concepto servicio
    if (factura.concepto !== 'productos') {
      if (!factura.fechaServicioDesde || !factura.fechaServicioHasta) {
        errores.push('Servicios requieren fechas de servicio');
      }
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Convierte DatosFactura al formato ComprobanteDatos interno
   */
  private convertirFacturaAComprobante(factura: DatosFactura): ComprobanteDatos {
    console.log('🔧 [convertirFacturaAComprobante] condicionIVA recibida:', factura.cliente.condicionIVA);
    console.log('🔧 [convertirFacturaAComprobante] tipoDocumento recibido:', factura.cliente.tipoDocumento);
    console.log('🔧 [convertirFacturaAComprobante] tipoComprobante:', factura.tipoComprobante);
    
    // Si ya es un número (como string), usarlo directamente
    // Si no, intentar convertir desde descripción textual
    let condicionIVACode: number;
    if (/^\d+$/.test(factura.cliente.condicionIVA)) {
      // Es un código numérico (como string "1", "5", "6", etc.)
      condicionIVACode = parseInt(factura.cliente.condicionIVA, 10);
      console.log('🔧 [convertirFacturaAComprobante] usando código numérico directo:', condicionIVACode);
    } else {
      // Es una descripción textual, convertir
      condicionIVACode = AFIPServiceSOAP.convertirCondicionIVA(factura.cliente.condicionIVA);
      console.log('🔧 [convertirFacturaAComprobante] condicionIVA convertida desde descripción:', condicionIVACode);
    }
    
    console.log('🔧 [convertirFacturaAComprobante] ✅ condicionIVACode FINAL a usar:', condicionIVACode);
    
    // CRÍTICO: Validar coherencia entre tipo documento, condición IVA y tipo comprobante
    // Para Factura B a Consumidor Final: AFIP NO valida CUITs, debe usarse DNI (96)
    let tipoDocumentoFinal = AFIPServiceSOAP.convertirTipoDocumento(factura.cliente.tipoDocumento);
    let numeroDocumentoFinal = factura.cliente.numeroDocumento;
    
    const esFacturaB = factura.tipoComprobante === 'B' || factura.tipoComprobante === 'B_NC' || factura.tipoComprobante === 'B_ND';
    const esConsumidorFinal = condicionIVACode === CONDICION_IVA.CONSUMIDOR_FINAL;
    const tieneDocTipoCUIT = tipoDocumentoFinal === TIPO_DOCUMENTO.CUIT;
    
    if (esFacturaB && esConsumidorFinal && tieneDocTipoCUIT) {
      // AFIP rechaza CUITs no registrados en padrones para Consumidor Final
      // Solución: usar DNI (96) en lugar de CUIT (80) para estos casos
      console.log('⚠️  [convertirFacturaAComprobante] Factura B a Consumidor Final con CUIT detectado');
      console.log('   → Cambiando DocTipo de CUIT (80) a DNI (96) para evitar validación de padrones');
      tipoDocumentoFinal = TIPO_DOCUMENTO.DNI;
      // El número de documento se mantiene (AFIP acepta el CUIT como número de DNI sin validar)
    }
    
    console.log('🔧 [convertirFacturaAComprobante] tipoDocumento FINAL:', tipoDocumentoFinal);
    
    return {
      puntoVenta: factura.puntoVenta,
      tipoComprobante: AFIPServiceSOAP.convertirTipoComprobante(factura.tipoComprobante),
      concepto: this.convertirConcepto(factura.concepto),
      tipoDocumento: tipoDocumentoFinal,
      numeroDocumento: numeroDocumentoFinal,
      condicionIVA: condicionIVACode, // ✅ DEBE SER NUMBER, NO UNDEFINED
      fecha: factura.fecha,
      importeTotal: factura.importes.total,
      importeNoGravado: factura.importes.noGravado,
      importeExento: factura.importes.exento,
      importeNeto: factura.importes.neto,
      importeIVA: factura.importes.iva,
      importeTributos: factura.importes.tributos,
      monedaId: 'PES',
      monedaCotizacion: 1,
      ...(factura.iva && {
        iva: factura.iva.map(i => ({
          id: AFIPServiceSOAP.convertirAlicuotaIVA(i.alicuota),
          baseImponible: i.baseImponible,
          importe: i.importe
        }))
      }),
      ...(factura.tributos && { tributos: factura.tributos }),
      ...(factura.fechaServicioDesde && { fechaServicioDesde: factura.fechaServicioDesde }),
      ...(factura.fechaServicioHasta && { fechaServicioHasta: factura.fechaServicioHasta }),
      ...(factura.fechaVencimientoPago && { fechaVencimientoPago: factura.fechaVencimientoPago }),
      ...(factura.comprobantesAsociados && {
        comprobantesAsociados: factura.comprobantesAsociados.map(c => ({
          tipo: AFIPServiceSOAP.convertirTipoComprobante(c.tipo),
          puntoVenta: c.puntoVenta,
          numero: c.numero,
          ...(c.cuit && { cuit: c.cuit }),
          ...(c.fecha && { fecha: c.fecha })
        }))
      })
    };
  }

  /**
   * Convierte concepto de string a código numérico
   */
  private convertirConcepto(concepto: string): number {
    switch (concepto) {
      case 'productos': return 1;
      case 'servicios': return 2;
      case 'productos_servicios': return 3;
      default: return 1;
    }
  }

  /**
   * Convierte tipo de comprobante de letra a código AFIP
   */
  static convertirTipoComprobante(tipo: string): number {
    switch (tipo.toUpperCase()) {
      // Facturas
      case 'A': 
      case 'FACTURA_A':
        return TIPO_COMPROBANTE.FACTURA_A;
      case 'B': 
      case 'FACTURA_B':
        return TIPO_COMPROBANTE.FACTURA_B;
      case 'C': 
      case 'FACTURA_C':
        return TIPO_COMPROBANTE.FACTURA_C;
      
      // Notas de Débito
      case 'A_ND':
      case 'NOTA_DEBITO_A':
        return TIPO_COMPROBANTE.NOTA_DEBITO_A;
      case 'B_ND':
      case 'NOTA_DEBITO_B':
        return TIPO_COMPROBANTE.NOTA_DEBITO_B;
      case 'C_ND':
      case 'NOTA_DEBITO_C':
        return TIPO_COMPROBANTE.NOTA_DEBITO_C;
      
      // Notas de Crédito
      case 'A_NC':
      case 'NOTA_CREDITO_A':
        return TIPO_COMPROBANTE.NOTA_CREDITO_A;
      case 'B_NC':
      case 'NOTA_CREDITO_B':
        return TIPO_COMPROBANTE.NOTA_CREDITO_B;
      case 'C_NC':
      case 'NOTA_CREDITO_C':
        return TIPO_COMPROBANTE.NOTA_CREDITO_C;
      
      default: 
        throw new Error(`Tipo de comprobante no reconocido: ${tipo}`);
    }
  }

  /**
   * Convierte tipo de documento de string a código AFIP
   */
  static convertirTipoDocumento(tipo: string): number {
    const tipoUpper = tipo.toUpperCase().trim();
    
    // Si ya es un código numérico, devolverlo directamente
    if (/^\d+$/.test(tipoUpper)) {
      const codigo = parseInt(tipoUpper, 10);
      // Validar que sea un código válido de AFIP
      const codigosValidos = [80, 86, 87, 89, 90, 91, 92, 93, 94, 95, 96, 99, 30];
      if (codigosValidos.includes(codigo)) {
        return codigo;
      }
      console.warn(`⚠️ Código de documento ${codigo} no reconocido, usando DNI (96)`);
      return TIPO_DOCUMENTO.DNI;
    }
    
    // Si es un nombre, convertirlo
    switch (tipoUpper) {
      case 'CUIT': return TIPO_DOCUMENTO.CUIT;
      case 'CUIL': return TIPO_DOCUMENTO.CUIL;
      case 'DNI': return TIPO_DOCUMENTO.DNI;
      case 'CDI': return TIPO_DOCUMENTO.CDI;
      case 'LE': return TIPO_DOCUMENTO.LE;
      case 'LC': return TIPO_DOCUMENTO.LC;
      case 'PASAPORTE': return TIPO_DOCUMENTO.PASAPORTE;
      case 'CI': return TIPO_DOCUMENTO.CI_EXTRANJERA;
      default: 
        console.warn(`⚠️ Tipo de documento "${tipo}" no reconocido, usando DNI (96)`);
        return TIPO_DOCUMENTO.DNI;
    }
  }

  /**
   * Convierte alícuota de IVA a código AFIP
   */
  static convertirAlicuotaIVA(alicuota: number): number {
    if (alicuota === 0) return ALICUOTA_IVA[0];
    if (alicuota === 2.5) return ALICUOTA_IVA[2.5];
    if (alicuota === 5) return ALICUOTA_IVA[5];
    if (alicuota === 10.5) return ALICUOTA_IVA[10.5];
    if (alicuota === 21) return ALICUOTA_IVA[21];
    if (alicuota === 27) return ALICUOTA_IVA[27];
    
    throw new Error(`Alícuota de IVA no reconocida: ${alicuota}`);
  }

  /**
   * Convierte condición IVA del cliente a código AFIP (RG 5616)
   */
  static convertirCondicionIVA(condicion: string): number {
    const condicionNormalizada = condicion.toUpperCase().replace(/\s+/g, '_');
    
    switch (condicionNormalizada) {
      case 'RESPONSABLE_INSCRIPTO':
      case 'RESPONSABLE_INSCRITO':
        return CONDICION_IVA.RESPONSABLE_INSCRIPTO;
      
      case 'RESPONSABLE_NO_INSCRIPTO':
      case 'RESPONSABLE_NO_INSCRITO':
        return CONDICION_IVA.RESPONSABLE_NO_INSCRIPTO;
      
      case 'EXENTO':
        return CONDICION_IVA.EXENTO;
      
      case 'NO_RESPONSABLE':
        return CONDICION_IVA.NO_RESPONSABLE;
      
      case 'CONSUMIDOR_FINAL':
        return CONDICION_IVA.CONSUMIDOR_FINAL;
      
      // Todas las variantes de Monotributo
      case 'MONOTRIBUTO':
      case 'MONOTRIBUTISTA':
      case 'RESPONSABLE_MONOTRIBUTO':
      case 'MONO_TRIBUTO':
        return CONDICION_IVA.RESPONSABLE_MONOTRIBUTO;
      
      case 'NO_CATEGORIZADO':
        return CONDICION_IVA.NO_CATEGORIZADO;
      
      case 'PROVEEDOR_EXTERIOR':
        return CONDICION_IVA.PROVEEDOR_EXTERIOR;
      
      case 'CLIENTE_EXTERIOR':
        return CONDICION_IVA.CLIENTE_EXTERIOR;
      
      case 'IVA_LIBERADO':
      case 'LIBERADO':
        return CONDICION_IVA.IVA_LIBERADO;
      
      case 'AGENTE_PERCEPCION':
      case 'AGENTE_DE_PERCEPCION':
        return CONDICION_IVA.AGENTE_PERCEPCION;
      
      case 'PEQUENO_CONTRIBUYENTE_EVENTUAL':
      case 'PEQUEÑO_CONTRIBUYENTE_EVENTUAL':
        return CONDICION_IVA.PEQUENO_CONTRIBUYENTE_EVENTUAL;
      
      case 'MONOTRIBUTISTA_SOCIAL':
      case 'MONO_TRIBUTISTA_SOCIAL':
        return CONDICION_IVA.MONOTRIBUTISTA_SOCIAL;
      
      case 'PEQUENO_CONTRIBUYENTE_EVENTUAL_SOCIAL':
      case 'PEQUEÑO_CONTRIBUYENTE_EVENTUAL_SOCIAL':
        return CONDICION_IVA.PEQUENO_CONTRIBUYENTE_EVENTUAL_SOCIAL;
      
      default:
        console.error(`❌ Condición IVA no reconocida: "${condicion}"`);
        console.error(`❌ Normalizada: "${condicionNormalizada}"`);
        console.error(`❌ Condiciones válidas: RESPONSABLE_INSCRIPTO, MONOTRIBUTISTA, CONSUMIDOR_FINAL, EXENTO, etc.`);
        throw new Error(`Condición IVA no reconocida: ${condicion}`);
    }
  }

  /**
   * Calcula dígito verificador para código de barras
   */
  private static calcularDigitoVerificador(codigo: string): string {
    let suma = 0;
    let multiplicador = 2;
    
    for (let i = codigo.length - 1; i >= 0; i--) {
      const digito = codigo[i];
      if (digito) {
        suma += parseInt(digito) * multiplicador;
        multiplicador = multiplicador === 2 ? 7 : 2;
      }
    }
    
    const resto = suma % 11;
    const dv = 11 - resto;
    
    if (dv === 11) return '0';
    if (dv === 10) return '1';
    return dv.toString();
  }
}

export default AFIPServiceSOAP;
