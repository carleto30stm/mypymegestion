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
   * Consulta el estado del servidor AFIP
   */
  async consultarEstadoServidor(): Promise<{
    appServer: string;
    dbServer: string;
    authServer: string;
  }> {
    return await this.wsfeService.consultarEstadoServidor();
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
   * Este método es más preciso porque consulta los servicios de AFIP
   */
  async determinarTipoFacturaDesdeAFIP(
    cuitCliente: string,
    empresaCondicionIVA: string
  ): Promise<{ 
    tipoFactura: string; 
    condicionIVA: number; 
    descripcionCondicion: string;
    discriminaIVA: boolean;
  }> {
    try {
      console.log('\n🔍 ========== CONSULTA AFIP PARA TIPO FACTURA ==========');
      console.log('🔍 CUIT Cliente:', cuitCliente);
      console.log('🔍 Empresa condición IVA:', empresaCondicionIVA);

      // Consultar condiciones IVA disponibles desde AFIP
      const condicionesIVA = await this.wsfeService.obtenerCondicionesIVA();
      console.log('📋 Condiciones IVA obtenidas de AFIP:', condicionesIVA.length);

      // Consultar tipos de comprobante habilitados
      const tiposComprobante = await this.wsfeService.obtenerTiposComprobante();
      console.log('📋 Tipos comprobante habilitados:', tiposComprobante.map((t: any) => `${t.id}-${t.descripcion}`).join(', '));

      // Normalizar empresa
      const empresaNorm = empresaCondicionIVA.toUpperCase().replace(/\s+/g, '_');
      const empresaRI = empresaNorm === 'RESPONSABLE_INSCRIPTO' || empresaNorm === 'RESPONSABLE_INSCRITO';

      // Por defecto: Consumidor Final (lo más común)
      let condicionIVACliente = CONDICION_IVA.CONSUMIDOR_FINAL;
      let descripcionCondicion = 'Consumidor Final';
      
      // Si el CUIT tiene formato válido, detectar por prefijo
      const cuitLimpio = cuitCliente.replace(/[^0-9]/g, '');
      if (cuitLimpio.length === 11) {
        // CUIT válido - analizar prefijo
        const prefijo = cuitLimpio.substring(0, 2);
        
        console.log('🔍 Prefijo CUIT detectado:', prefijo);
        
        if (prefijo === '30' || prefijo === '33') {
          // Persona jurídica - generalmente RI
          condicionIVACliente = CONDICION_IVA.RESPONSABLE_INSCRIPTO;
          descripcionCondicion = 'Responsable Inscripto';
          console.log('✅ CUIT 30/33 → Persona Jurídica → Responsable Inscripto');
        } else if (prefijo === '20' || prefijo === '23' || prefijo === '27') {
          // Persona física - casi siempre monotributo
          // EXCEPCIÓN: Algunos profesionales con CUIT 20/27 pueden ser RI
          // Pero por defecto asumimos Monotributo (más común y más seguro)
          condicionIVACliente = CONDICION_IVA.RESPONSABLE_MONOTRIBUTO;
          descripcionCondicion = 'Monotributista';
          console.log('✅ CUIT 20/23/27 → Persona Física → Monotributista (por defecto)');
        }
      } else {
        console.log('⚠️  CUIT inválido o DNI - asumiendo Consumidor Final');
      }

      console.log('🎯 Condición IVA detectada:', descripcionCondicion, `(código ${condicionIVACliente})`);

      // Determinar tipo de factura según lógica de negocio
      let tipoFactura: string;
      let discriminaIVA: boolean;

      if (!empresaRI) {
        tipoFactura = 'C';
        discriminaIVA = false;
      } else {
        if (condicionIVACliente === CONDICION_IVA.RESPONSABLE_INSCRIPTO) {
          tipoFactura = 'A';
          discriminaIVA = true;
        } else {
          tipoFactura = 'B';
          discriminaIVA = true;
        }
      }

      console.log('📄 Tipo factura determinado:', tipoFactura);
      console.log('💰 Discrimina IVA:', discriminaIVA);
      console.log('========== FIN CONSULTA AFIP ==========\n');

      return {
        tipoFactura,
        condicionIVA: condicionIVACliente,
        descripcionCondicion,
        discriminaIVA
      };
    } catch (error: any) {
      console.error('❌ Error al consultar AFIP para tipo factura:', error.message);
      console.log('⚠️  Usando lógica estática como fallback');
      
      return {
        tipoFactura: 'B',
        condicionIVA: CONDICION_IVA.CONSUMIDOR_FINAL,
        descripcionCondicion: 'Consumidor Final (fallback)',
        discriminaIVA: true
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
    
    return {
      puntoVenta: factura.puntoVenta,
      tipoComprobante: AFIPServiceSOAP.convertirTipoComprobante(factura.tipoComprobante),
      concepto: this.convertirConcepto(factura.concepto),
      tipoDocumento: AFIPServiceSOAP.convertirTipoDocumento(factura.cliente.tipoDocumento),
      numeroDocumento: factura.cliente.numeroDocumento,
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
          numero: c.numero
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
      case 'A': return TIPO_COMPROBANTE.FACTURA_A;
      case 'B': return TIPO_COMPROBANTE.FACTURA_B;
      case 'C': return TIPO_COMPROBANTE.FACTURA_C;
      case 'A_ND': return TIPO_COMPROBANTE.NOTA_DEBITO_A;
      case 'B_ND': return TIPO_COMPROBANTE.NOTA_DEBITO_B;
      case 'C_ND': return TIPO_COMPROBANTE.NOTA_DEBITO_C;
      case 'A_NC': return TIPO_COMPROBANTE.NOTA_CREDITO_A;
      case 'B_NC': return TIPO_COMPROBANTE.NOTA_CREDITO_B;
      case 'C_NC': return TIPO_COMPROBANTE.NOTA_CREDITO_C;
      default: throw new Error(`Tipo de comprobante no reconocido: ${tipo}`);
    }
  }

  /**
   * Convierte tipo de documento de string a código AFIP
   */
  static convertirTipoDocumento(tipo: string): number {
    switch (tipo.toUpperCase()) {
      case 'CUIT': return TIPO_DOCUMENTO.CUIT;
      case 'CUIL': return TIPO_DOCUMENTO.CUIL;
      case 'DNI': return TIPO_DOCUMENTO.DNI;
      case 'CDI': return TIPO_DOCUMENTO.CDI;
      case 'LE': return TIPO_DOCUMENTO.LE;
      case 'LC': return TIPO_DOCUMENTO.LC;
      case 'PASAPORTE': return TIPO_DOCUMENTO.PASAPORTE;
      case 'CI': return TIPO_DOCUMENTO.CI_EXTRANJERA;
      default: return TIPO_DOCUMENTO.DNI;
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
