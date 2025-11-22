import Afip from '@afipsdk/afip.js';
import moment from 'moment';
import type { IFactura } from '../models/Factura.js';
import { TIPO_COMPROBANTE_CODIGO } from '../models/Factura.js';
import { cargarCertificadosAFIP, asegurarCarpetaTokens } from '../utils/certificadosHelper.js';

// Configuración de AFIP
export interface AFIPConfig {
  CUIT: string;
  cert?: string;       // Ruta al certificado O contenido PEM (opcional si usa variables de entorno)
  key?: string;        // Ruta a la clave privada O contenido PEM (opcional si usa variables de entorno)
  production: boolean; // true para producción, false para homologación
  ta_folder?: string;  // Carpeta para guardar tickets de autorización
}

// Mapeo de condición IVA a código AFIP
const CONDICION_IVA_CODIGO: Record<string, number> = {
  'Responsable Inscripto': 1,
  'Monotributista': 6,
  'Exento': 4,
  'Consumidor Final': 5
};

// Mapeo de tipo de documento
const TIPO_DOCUMENTO_CODIGO: Record<string, number> = {
  'CUIT': 80,
  'CUIL': 86,
  'DNI': 96,
  'Pasaporte': 94
};

// Códigos de alícuota IVA para AFIP
const ALICUOTA_IVA_CODIGO: Record<number, number> = {
  0: 3,      // No gravado
  2.5: 9,    // 2.5%
  5: 8,      // 5%
  10.5: 4,   // 10.5%
  21: 5,     // 21%
  27: 6      // 27%
};

export class AFIPService {
  private afip: any;
  private config: AFIPConfig;

  constructor(config: AFIPConfig) {
    this.config = config;
    
    // Cargar certificados usando el helper (soporta archivos y variables de entorno)
    const certificados = cargarCertificadosAFIP();

    this.afip = new Afip({
      CUIT: config.CUIT,
      cert: certificados.cert,
      key: certificados.key,
      production: config.production,
      ta_folder: config.ta_folder || './afip_tokens'
    });
  }

  /**
   * Obtiene el último número de comprobante autorizado
   */
  async obtenerUltimoNumeroComprobante(
    puntoVenta: number, 
    tipoComprobante: number
  ): Promise<number> {
    try {
      const ultimoComprobante = await this.afip.ElectronicBilling.getLastVoucher(
        puntoVenta,
        tipoComprobante
      );
      return ultimoComprobante;
    } catch (error: any) {
      console.error('Error al obtener último comprobante:', error);
      throw new Error(`Error AFIP: ${error.message}`);
    }
  }

  /**
   * Solicita CAE (Código de Autorización Electrónico) a AFIP
   */
  async solicitarCAE(factura: IFactura): Promise<{
    cae: string;
    fechaVencimientoCAE: Date;
    numeroComprobante: string;
    resultado: string;
    observaciones?: string[];
    errores?: string[];
  }> {
    try {
      const tipoComprobante = TIPO_COMPROBANTE_CODIGO[factura.tipoComprobante];
      
      // Obtener próximo número de comprobante
      const ultimoNumero = await this.obtenerUltimoNumeroComprobante(
        factura.datosAFIP.puntoVenta,
        tipoComprobante
      );
      const proximoNumero = ultimoNumero + 1;

      // Preparar datos del comprobante
      const data = {
        CantReg: 1, // Cantidad de comprobantes a registrar
        PtoVta: factura.datosAFIP.puntoVenta,
        CbteTipo: tipoComprobante,
        Concepto: factura.concepto,
        DocTipo: factura.receptorTipoDocumento,
        DocNro: factura.receptorNumeroDocumento.replace(/[^0-9]/g, ''),
        CbteDesde: proximoNumero,
        CbteHasta: proximoNumero,
        CbteFch: moment(factura.fecha).format('YYYYMMDD'),
        ImpTotal: this.redondear(factura.importeTotal),
        ImpTotConc: this.redondear(factura.importeNoGravado),
        ImpNeto: this.redondear(factura.importeNetoGravado),
        ImpOpEx: this.redondear(factura.importeExento),
        ImpIVA: this.redondear(factura.importeIVA),
        ImpTrib: this.redondear(factura.importeOtrosTributos),
        MonId: factura.monedaId,
        MonCotiz: factura.cotizacionMoneda,
        
        // IVA por alícuota
        Iva: factura.detalleIVA.map(detalle => ({
          Id: ALICUOTA_IVA_CODIGO[detalle.alicuota],
          BaseImp: this.redondear(detalle.baseImponible),
          Importe: this.redondear(detalle.importe)
        }))
      };

      // Agregar fechas de servicio si el concepto es 2 o 3
      if (factura.concepto === 2 || factura.concepto === 3) {
        Object.assign(data, {
          FchServDesde: moment(factura.fechaServicioDesde).format('YYYYMMDD'),
          FchServHasta: moment(factura.fechaServicioHasta).format('YYYYMMDD'),
          FchVtoPago: moment(factura.fechaVencimientoPago || factura.fecha).format('YYYYMMDD')
        });
      }

      // Agregar otros tributos si existen
      if (factura.otrosTributos && factura.otrosTributos.length > 0) {
        Object.assign(data, {
          Tributos: factura.otrosTributos.map(tributo => ({
            Id: tributo.codigo,
            Desc: tributo.descripcion,
            BaseImp: this.redondear(tributo.baseImponible),
            Alic: tributo.alicuota,
            Importe: this.redondear(tributo.importe)
          }))
        });
      }

      // Agregar comprobante asociado si existe (para notas de crédito/débito)
      if (factura.comprobanteAsociado) {
        Object.assign(data, {
          CbtesAsoc: [{
            Tipo: factura.comprobanteAsociado.tipo,
            PtoVta: factura.comprobanteAsociado.puntoVenta,
            Nro: factura.comprobanteAsociado.numero
          }]
        });
      }

      console.log('📤 Enviando datos a AFIP:', JSON.stringify(data, null, 2));

      // Crear comprobante en AFIP
      const resultado = await this.afip.ElectronicBilling.createVoucher(data);

      console.log('📥 Respuesta de AFIP:', JSON.stringify(resultado, null, 2));

      // Procesar resultado
      if (resultado.CAE) {
        const numeroComprobante = `${String(factura.datosAFIP.puntoVenta).padStart(5, '0')}-${String(proximoNumero).padStart(8, '0')}`;
        
        return {
          cae: resultado.CAE,
          fechaVencimientoCAE: moment(resultado.CAEFchVto, 'YYYYMMDD').toDate(),
          numeroComprobante,
          resultado: 'A', // Aprobado
          observaciones: resultado.Observaciones || []
        };
      } else {
        // Error en la autorización
        return {
          cae: '',
          fechaVencimientoCAE: new Date(),
          numeroComprobante: '',
          resultado: 'R', // Rechazado
          errores: resultado.Errors || ['Error desconocido']
        };
      }
    } catch (error: any) {
      console.error('❌ Error al solicitar CAE:', error);
      throw new Error(`Error AFIP: ${error.message || 'Error desconocido'}`);
    }
  }

  /**
   * Verifica el estado de un comprobante con CAE
   */
  async verificarCAE(
    cae: string,
    tipoComprobante: number,
    puntoVenta: number,
    numeroComprobante: number
  ): Promise<boolean> {
    try {
      const resultado = await this.afip.ElectronicBilling.getVoucherInfo(
        numeroComprobante,
        puntoVenta,
        tipoComprobante
      );
      
      return resultado.CAE === cae;
    } catch (error: any) {
      console.error('Error al verificar CAE:', error);
      return false;
    }
  }

  /**
   * Obtiene los puntos de venta habilitados
   */
  async obtenerPuntosVenta(): Promise<number[]> {
    try {
      const puntosVenta = await this.afip.ElectronicBilling.getSalesPoints();
      return puntosVenta.map((pv: any) => pv.Nro);
    } catch (error: any) {
      console.error('Error al obtener puntos de venta:', error);
      throw new Error(`Error AFIP: ${error.message}`);
    }
  }

  /**
   * Determina el tipo de factura según la condición IVA del cliente
   */
  static determinarTipoFactura(
    condicionIVAEmisor: string,
    condicionIVAReceptor: string
  ): 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' {
    // Si el emisor NO es Responsable Inscripto, solo puede emitir Factura C
    if (condicionIVAEmisor !== 'Responsable Inscripto') {
      return 'FACTURA_C';
    }

    // Si el receptor es Responsable Inscripto o Exento -> Factura A
    if (condicionIVAReceptor === 'Responsable Inscripto' || 
        condicionIVAReceptor === 'Exento') {
      return 'FACTURA_A';
    }

    // Si el receptor es Monotributista -> Factura B
    if (condicionIVAReceptor === 'Monotributista') {
      return 'FACTURA_B';
    }

    // Consumidor Final -> Factura B (o C si no discrimina IVA)
    return 'FACTURA_B';
  }

  /**
   * Obtiene el código de tipo de documento para AFIP
   */
  static obtenerCodigoTipoDocumento(tipoDocumento: string): number {
    return TIPO_DOCUMENTO_CODIGO[tipoDocumento] || 99; // 99 = Sin identificar
  }

  /**
   * Calcula el IVA según la alícuota
   */
  static calcularIVA(importeNeto: number, alicuota: number): number {
    return this.redondear(importeNeto * (alicuota / 100));
  }

  /**
   * Redondea a 2 decimales
   */
  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  static redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  /**
   * Genera el código de barras para impresión
   */
  static generarCodigoBarras(
    cuit: string,
    tipoComprobante: number,
    puntoVenta: number,
    cae: string,
    fechaVencimiento: Date
  ): string {
    const cuitLimpio = cuit.replace(/[^0-9]/g, '');
    const tipo = String(tipoComprobante).padStart(3, '0');
    const ptoVenta = String(puntoVenta).padStart(5, '0');
    const fechaVto = moment(fechaVencimiento).format('YYYYMMDD');
    
    // Código de barras interleaved 2 of 5
    return `${cuitLimpio}${tipo}${ptoVenta}${cae}${fechaVto}`;
  }

  /**
   * Valida que los datos de la factura sean correctos antes de enviar a AFIP
   */
  static validarFactura(factura: IFactura): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    // Validar CUIT
    if (!factura.emisorCUIT || factura.emisorCUIT.length < 11) {
      errores.push('CUIT del emisor inválido');
    }

    // Validar documento receptor
    if (!factura.receptorNumeroDocumento) {
      errores.push('Documento del receptor requerido');
    }

    // Validar items
    if (!factura.items || factura.items.length === 0) {
      errores.push('Debe haber al menos un item');
    }

    // Validar totales
    if (factura.importeTotal <= 0) {
      errores.push('El importe total debe ser mayor a 0');
    }

    // Validar fechas de servicio si el concepto lo requiere
    if (factura.concepto === 2 || factura.concepto === 3) {
      if (!factura.fechaServicioDesde || !factura.fechaServicioHasta) {
        errores.push('Las fechas de servicio son requeridas para este concepto');
      }
    }

    // Validar punto de venta
    if (!factura.datosAFIP.puntoVenta || factura.datosAFIP.puntoVenta <= 0) {
      errores.push('Punto de venta inválido');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }
}

export default AFIPService;
