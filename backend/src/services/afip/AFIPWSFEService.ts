/**
 * AFIP WSFE Service - Web Service de Facturación Electrónica
 * 
 * Este servicio maneja la facturación electrónica con AFIP mediante SOAP directo.
 * Permite autorizar comprobantes, consultar CAEs, obtener último número, etc.
 * 
 * @author Sistema myGestor
 * @version 2.0.0 - SOAP Directo (sin SDK comercial)
 */

import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import * as momentModule from 'moment';
const moment = momentModule.default || momentModule;
import type { TicketAcceso } from './AFIPWSAAService.js';
import AFIPWSAAService from './AFIPWSAAService.js';

// URLs de WSFE según ambiente
const WSFE_URLS = {
  production: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
  homologacion: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx'
};

// Tipos de comprobantes AFIP
export const TIPO_COMPROBANTE = {
  FACTURA_A: 1,
  FACTURA_B: 6,
  FACTURA_C: 11,
  NOTA_DEBITO_A: 2,
  NOTA_DEBITO_B: 7,
  NOTA_DEBITO_C: 12,
  NOTA_CREDITO_A: 3,
  NOTA_CREDITO_B: 8,
  NOTA_CREDITO_C: 13
};

// Códigos de alícuota IVA
export const ALICUOTA_IVA = {
  0: 3,      // No gravado
  2.5: 9,    // 2.5%
  5: 8,      // 5%
  10.5: 4,   // 10.5%
  21: 5,     // 21%
  27: 6      // 27%
};

// Códigos de condición IVA del receptor (RG 5616)
export const CONDICION_IVA = {
  RESPONSABLE_INSCRIPTO: 1,
  RESPONSABLE_NO_INSCRIPTO: 2,
  EXENTO: 3,
  NO_RESPONSABLE: 4,
  CONSUMIDOR_FINAL: 5,
  RESPONSABLE_MONOTRIBUTO: 6,
  NO_CATEGORIZADO: 7,
  PROVEEDOR_EXTERIOR: 8,
  CLIENTE_EXTERIOR: 9,
  IVA_LIBERADO: 10,
  AGENTE_PERCEPCION: 11,
  PEQUENO_CONTRIBUYENTE_EVENTUAL: 12,
  MONOTRIBUTISTA_SOCIAL: 13,
  PEQUENO_CONTRIBUYENTE_EVENTUAL_SOCIAL: 14
};

// Tipos de documento
export const TIPO_DOCUMENTO = {
  CUIT: 80,
  CUIL: 86,
  CDI: 87,
  LE: 89,
  LC: 90,
  CI_EXTRANJERA: 91,
  EN_TRAMITE: 92,
  ACTA_NACIMIENTO: 93,
  PASAPORTE: 94,
  CI_BS_AS_RNP: 95,
  DNI: 96,
  SIN_IDENTIFICAR: 99,
  CERT_MIGRACION: 30
};

export interface ComprobanteDatos {
  // Identificación
  puntoVenta: number;
  tipoComprobante: number;
  concepto: number; // 1=Productos, 2=Servicios, 3=Productos y Servicios

  // Cliente
  tipoDocumento: number;
  numeroDocumento: string;
  condicionIVA?: number; // Código de condición IVA del receptor (RG 5616)

  // Fecha
  fecha: Date;

  // Importes
  importeTotal: number;
  importeNoGravado: number;
  importeExento: number;
  importeNeto: number;
  importeIVA: number;
  importeTributos: number;

  // Moneda
  monedaId: string; // 'PES', 'DOL', etc.
  monedaCotizacion: number;

  // IVA
  iva?: Array<{
    id: number; // Código de alícuota
    baseImponible: number;
    importe: number;
  }>;

  // Tributos (opcional)
  tributos?: Array<{
    id: number;
    descripcion: string;
    baseImponible: number;
    alicuota: number;
    importe: number;
  }>;

  // Para servicios (concepto 2 o 3)
  fechaServicioDesde?: Date;
  fechaServicioHasta?: Date;
  fechaVencimientoPago?: Date;

  // Comprobantes asociados (para NC/ND)
  comprobantesAsociados?: Array<{
    tipo: number;
    puntoVenta: number;
    numero: number;
  }>;
}

export interface ResultadoCAE {
  cae: string;
  fechaVencimientoCAE: Date;
  numeroComprobante: number;
  resultado: 'A' | 'R'; // Aprobado / Rechazado
  observaciones?: string[];
  errores?: string[];
}

export interface WSFEConfig {
  cuit: string;
  certPath: string;
  keyPath: string;
  production: boolean;
  taFolder?: string;
}

export class AFIPWSFEService {
  private config: WSFEConfig;
  private wsaaService: AFIPWSAAService;
  private wsfeUrl: string;

  constructor(config: WSFEConfig) {
    this.config = config;
    this.wsaaService = new AFIPWSAAService(config);
    this.wsfeUrl = config.production
      ? WSFE_URLS.production
      : WSFE_URLS.homologacion;
  }

  /**
   * Obtiene el último número de comprobante autorizado
   */
  async obtenerUltimoComprobante(puntoVenta: number, tipoComprobante: number): Promise<number> {
    const ta = await this.wsaaService.obtenerTicketAcceso('wsfe');

    const soapRequest = this.construirSOAP('FECompUltimoAutorizado', `
      <ar:PtoVta>${puntoVenta}</ar:PtoVta>
      <ar:CbteTipo>${tipoComprobante}</ar:CbteTipo>
    `, ta);

    const response = await this.enviarSOAP(soapRequest, 'FECompUltimoAutorizado');
    const result = await this.parsearRespuesta(response.data, 'FECompUltimoAutorizadoResponse');

    // Validar resultado
    const cbteNro = result?.FECompUltimoAutorizadoResult?.CbteNro;
    if (cbteNro === undefined || cbteNro === null) {
      // Si no hay comprobantes previos, retornar 0
      return 0;
    }

    return parseInt(cbteNro);
  }

  /**
   * Autoriza un comprobante y solicita CAE
   */
  async solicitarCAE(datos: ComprobanteDatos): Promise<ResultadoCAE> {
    try {
      console.log('\n📋 ========== INICIO SOLICITUD CAE ==========');
      console.log('📋 Datos recibidos:', JSON.stringify(datos, null, 2));
      
      const ta = await this.wsaaService.obtenerTicketAcceso('wsfe');

      // Obtener próximo número
      const ultimoNumero = await this.obtenerUltimoComprobante(
        datos.puntoVenta,
        datos.tipoComprobante
      );
      const proximoNumero = ultimoNumero + 1;
      console.log('📊 Próximo número de comprobante:', proximoNumero);

      // Construir request de comprobante
      const feDetRequest = this.construirFeDetRequest(datos, proximoNumero);
      console.log('📝 FeDetRequest construido:', feDetRequest);

      const soapRequest = this.construirSOAP('FECAESolicitar', `
      <ar:FeCAEReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${datos.puntoVenta}</ar:PtoVta>
          <ar:CbteTipo>${datos.tipoComprobante}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          ${feDetRequest}
        </ar:FeDetReq>
      </ar:FeCAEReq>
    `, ta);

      console.log('\n🌐 ========== SOAP REQUEST ==========');
      console.log(soapRequest);
      console.log('========== FIN SOAP REQUEST ==========\n');

      const response = await this.enviarSOAP(soapRequest, 'FECAESolicitar');
      
      console.log('\n✅ ========== SOAP RESPONSE ==========');
      console.log('Status:', response.status);
      console.log('Data:', response.data);
      console.log('========== FIN SOAP RESPONSE ==========\n');
      
      const result = await this.parsearRespuesta(response.data, 'FECAESolicitarResponse');
      console.log('📦 Resultado parseado:', JSON.stringify(result, null, 2));

      const resultadoFinal = this.procesarResultadoCAE(result, proximoNumero);
      console.log('🎯 Resultado final CAE:', JSON.stringify(resultadoFinal, null, 2));
      console.log('========== FIN SOLICITUD CAE ==========\n');
      return resultadoFinal;
    } catch (error: any) {
      console.error('\n❌ ========== ERROR EN SOLICITUD CAE ==========');
      console.error('❌ Error en solicitarCAE:', error.message);
      if (error.stack) console.error('Stack:', error.stack);
      console.error('========== FIN ERROR ==========\n');
      throw error;
    }
  }

  /**
   * Consulta datos de un comprobante con CAE
   */
  async consultarComprobante(
    puntoVenta: number,
    tipoComprobante: number,
    numeroComprobante: number
  ): Promise<any> {
    const ta = await this.wsaaService.obtenerTicketAcceso('wsfe');

    const soapRequest = this.construirSOAP('FECompConsultar', `
      <ar:FeCompConsReq>
        <ar:CbteTipo>${tipoComprobante}</ar:CbteTipo>
        <ar:CbteNro>${numeroComprobante}</ar:CbteNro>
        <ar:PtoVta>${puntoVenta}</ar:PtoVta>
      </ar:FeCompConsReq>
    `, ta);

    const response = await this.enviarSOAP(soapRequest, 'FECompConsultar');
    const result = await this.parsearRespuesta(response.data, 'FECompConsultarResponse');

    return result?.FECompConsultarResult?.ResultGet;
  }

  /**
   * Obtiene el estado del servidor AFIP
   */
  async consultarEstadoServidor(): Promise<{
    appServer: string;
    dbServer: string;
    authServer: string;
  }> {
    const ta = await this.wsaaService.obtenerTicketAcceso('wsfe');

    const soapRequest = this.construirSOAP('FEDummy', '', ta);

    const response = await this.enviarSOAP(soapRequest, 'FEDummy');
    const result = await this.parsearRespuesta(response.data, 'FEDummyResponse');

    return {
      appServer: result?.FEDummyResult?.AppServer || 'UNKNOWN',
      dbServer: result?.FEDummyResult?.DbServer || 'UNKNOWN',
      authServer: result?.FEDummyResult?.AuthServer || 'UNKNOWN'
    };
  }

  /**
   * Obtiene los puntos de venta habilitados
   */
  async obtenerPuntosVenta(): Promise<Array<{ numero: number; bloqueado: boolean }>> {
    const ta = await this.wsaaService.obtenerTicketAcceso('wsfe');

    const soapRequest = this.construirSOAP('FEParamGetPtosVenta', '', ta);

    const response = await this.enviarSOAP(soapRequest, 'FEParamGetPtosVenta');
    const result = await this.parsearRespuesta(response.data, 'FEParamGetPtosVentaResponse');

    const puntosVenta = result?.FEParamGetPtosVentaResult?.ResultGet?.PtoVenta;

    if (!puntosVenta) {
      return [];
    }

    // Manejar caso de un solo punto de venta o múltiples
    const lista = Array.isArray(puntosVenta) ? puntosVenta : [puntosVenta];

    return lista.map((pv: any) => ({
      numero: parseInt(pv.Nro),
      bloqueado: pv.Bloqueado === 'S'
    }));
  }

  /**
   * Consulta tipos de comprobante habilitados
   * Retorna todos los tipos de comprobante que la empresa puede emitir
   */
  async obtenerTiposComprobante(): Promise<Array<{ id: number; descripcion: string; fechaDesde: string; fechaHasta?: string }>> {
    const ta = await this.wsaaService.obtenerTicketAcceso('wsfe');

    const soapRequest = this.construirSOAP('FEParamGetTiposCbte', '', ta);

    const response = await this.enviarSOAP(soapRequest, 'FEParamGetTiposCbte');
    const result = await this.parsearRespuesta(response.data, 'FEParamGetTiposCbteResponse');

    const tipos = result?.FEParamGetTiposCbteResult?.ResultGet?.CbteTipo;

    if (!tipos) {
      return [];
    }

    const lista = Array.isArray(tipos) ? tipos : [tipos];

    return lista.map((tipo: any) => ({
      id: parseInt(tipo.Id),
      descripcion: tipo.Desc,
      fechaDesde: tipo.FchDesde,
      fechaHasta: tipo.FchHasta || undefined
    }));
  }

  /**
   * Consulta condiciones IVA del receptor (padrón AFIP)
   * Retorna todas las condiciones IVA posibles según RG 5616
   */
  async obtenerCondicionesIVA(): Promise<Array<{ id: number; descripcion: string }>> {
    const ta = await this.wsaaService.obtenerTicketAcceso('wsfe');

    const soapRequest = this.construirSOAP('FEParamGetCondicionIvaReceptor', '', ta);

    const response = await this.enviarSOAP(soapRequest, 'FEParamGetCondicionIvaReceptor');
    const result = await this.parsearRespuesta(response.data, 'FEParamGetCondicionIvaReceptorResponse');

    const condiciones = result?.FEParamGetCondicionIvaReceptorResult?.ResultGet?.CondicionIva;

    if (!condiciones) {
      return [];
    }

    const lista = Array.isArray(condiciones) ? condiciones : [condiciones];

    return lista.map((cond: any) => ({
      id: parseInt(cond.Id),
      descripcion: cond.Desc
    }));
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Construye el mensaje SOAP completo
   */
  private construirSOAP(metodo: string, body: string, ta: TicketAcceso): string {
    const auth = `
      <ar:Auth>
        <ar:Token>${ta.token}</ar:Token>
        <ar:Sign>${ta.sign}</ar:Sign>
        <ar:Cuit>${this.config.cuit}</ar:Cuit>
      </ar:Auth>
    `;

    const soapXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:${metodo}>
      ${auth}
      ${body}
    </ar:${metodo}>
  </soapenv:Body>
</soapenv:Envelope>`;

    return soapXml;
  }

  /**
   * Construye el FEDetReq (detalle del comprobante)
   */
  private construirFeDetRequest(datos: ComprobanteDatos, numeroComprobante: number): string {
    // CRÍTICO: Validar que condicionIVA exista y sea un número válido
    if (!datos.condicionIVA || typeof datos.condicionIVA !== 'number') {
      console.error('❌ [construirFeDetRequest] condicionIVA INVÁLIDO:', datos.condicionIVA);
      throw new Error(`condicionIVA es obligatorio y debe ser un número (recibido: ${datos.condicionIVA})`);
    }
    
    console.log('✅ [construirFeDetRequest] condicionIVA a enviar en XML:', datos.condicionIVA);
    
    let xml = `
      <ar:FECAEDetRequest>
        <ar:Concepto>${datos.concepto}</ar:Concepto>
        <ar:DocTipo>${datos.tipoDocumento}</ar:DocTipo>
        <ar:DocNro>${datos.numeroDocumento.replace(/[^0-9]/g, '')}</ar:DocNro>
        <ar:CbteDesde>${numeroComprobante}</ar:CbteDesde>
        <ar:CbteHasta>${numeroComprobante}</ar:CbteHasta>
        <ar:CbteFch>${moment(datos.fecha).format('YYYYMMDD')}</ar:CbteFch>
        <ar:ImpTotal>${this.redondear(datos.importeTotal)}</ar:ImpTotal>
        <ar:ImpTotConc>${this.redondear(datos.importeNoGravado)}</ar:ImpTotConc>
        <ar:ImpNeto>${this.redondear(datos.importeNeto)}</ar:ImpNeto>
        <ar:ImpOpEx>${this.redondear(datos.importeExento)}</ar:ImpOpEx>
        <ar:ImpIVA>${this.redondear(datos.importeIVA)}</ar:ImpIVA>
        <ar:ImpTrib>${this.redondear(datos.importeTributos)}</ar:ImpTrib>
        <ar:MonId>${datos.monedaId}</ar:MonId>
        <ar:MonCotiz>${datos.monedaCotizacion}</ar:MonCotiz>
        <ar:CondicionIVAReceptorId>${datos.condicionIVA}</ar:CondicionIVAReceptorId>
    `;

    // Fechas de servicio (si concepto 2 o 3)
    if (datos.concepto === 2 || datos.concepto === 3) {
      xml += `
        <ar:FchServDesde>${moment(datos.fechaServicioDesde).format('YYYYMMDD')}</ar:FchServDesde>
        <ar:FchServHasta>${moment(datos.fechaServicioHasta).format('YYYYMMDD')}</ar:FchServHasta>
        <ar:FchVtoPago>${moment(datos.fechaVencimientoPago || datos.fecha).format('YYYYMMDD')}</ar:FchVtoPago>
      `;
    }

    // IVA
    if (datos.iva && datos.iva.length > 0) {
      xml += '<ar:Iva>';
      datos.iva.forEach(iva => {
        xml += `
          <ar:AlicIva>
            <ar:Id>${iva.id}</ar:Id>
            <ar:BaseImp>${this.redondear(iva.baseImponible)}</ar:BaseImp>
            <ar:Importe>${this.redondear(iva.importe)}</ar:Importe>
          </ar:AlicIva>
        `;
      });
      xml += '</ar:Iva>';
    }

    // Tributos
    if (datos.tributos && datos.tributos.length > 0) {
      xml += '<ar:Tributos>';
      datos.tributos.forEach(trib => {
        xml += `
          <ar:Tributo>
            <ar:Id>${trib.id}</ar:Id>
            <ar:Desc>${trib.descripcion}</ar:Desc>
            <ar:BaseImp>${this.redondear(trib.baseImponible)}</ar:BaseImp>
            <ar:Alic>${trib.alicuota}</ar:Alic>
            <ar:Importe>${this.redondear(trib.importe)}</ar:Importe>
          </ar:Tributo>
        `;
      });
      xml += '</ar:Tributos>';
    }

    // Comprobantes asociados
    if (datos.comprobantesAsociados && datos.comprobantesAsociados.length > 0) {
      xml += '<ar:CbtesAsoc>';
      datos.comprobantesAsociados.forEach(cbte => {
        xml += `
          <ar:CbteAsoc>
            <ar:Tipo>${cbte.tipo}</ar:Tipo>
            <ar:PtoVta>${cbte.puntoVenta}</ar:PtoVta>
            <ar:Nro>${cbte.numero}</ar:Nro>
          </ar:CbteAsoc>
        `;
      });
      xml += '</ar:CbtesAsoc>';
    }

    xml += '</ar:FECAEDetRequest>';

    return xml;
  }

  /**
   * Envía un mensaje SOAP a AFIP
   */
  private async enviarSOAP(soapMessage: string, metodo: string): Promise<any> {
    try {
      const response = await axios.post(this.wsfeUrl, soapMessage, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': `http://ar.gov.afip.dif.FEV1/${metodo}`
        },
        timeout: 30000
      });

      return response;
    } catch (error: any) {
      console.error('❌ Error en enviarSOAP:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        throw new Error(`Error HTTP ${error.response.status}: ${error.response.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Parsea la respuesta SOAP de AFIP
   */
  private async parsearRespuesta(xml: string, metodo: string): Promise<any> {
    try {
      // Verificar si el XML está vacío o es inválido
      if (!xml || xml.trim().length === 0) {
        throw new Error('XML vacío recibido de AFIP');
      }

      const result = await parseStringPromise(xml, {
        explicitArray: false,
        ignoreAttrs: true
      });

      const soapBody = result['soap:Envelope']?.['soap:Body'] ||
        result['soapenv:Envelope']?.['soapenv:Body'];

      if (!soapBody) {
        console.error('❌ No se encontró SOAP Body en la respuesta');
        throw new Error('Respuesta SOAP inválida');
      }

      // Verificar errores
      const fault = soapBody['soap:Fault'] || soapBody['soapenv:Fault'];
      if (fault) {
        console.error('❌ SOAP Fault detectado:', fault);
        throw new Error(`SOAP Fault: ${fault.faultstring || fault.faultString}`);
      }

      return soapBody[metodo];
    } catch (error: any) {
      console.error('❌ Error al parsear respuesta SOAP:', error.message);
      throw error;
    }
  }

  /**
   * Procesa el resultado de solicitud de CAE
   */
  private procesarResultadoCAE(result: any, numeroComprobante: number): ResultadoCAE {
    const feDetResp = result?.FECAESolicitarResult?.FeDetResp?.FECAEDetResponse;

    if (!feDetResp) {
      throw new Error('Respuesta de AFIP inválida: no se encontró FECAEDetResponse');
    }

    const resultado = feDetResp.Resultado; // 'A' = Aprobado, 'R' = Rechazado

    if (resultado === 'A') {
      const observaciones = this.extraerObservaciones(feDetResp.Observaciones);
      return {
        cae: feDetResp.CAE,
        fechaVencimientoCAE: moment(feDetResp.CAEFchVto, 'YYYYMMDD').toDate(),
        numeroComprobante,
        resultado: 'A',
        ...(observaciones && { observaciones })
      };
    } else {
      const errores = this.extraerErrores(feDetResp.Obs);
      return {
        cae: '',
        fechaVencimientoCAE: new Date(),
        numeroComprobante,
        resultado: 'R',
        ...(errores && { errores })
      };
    }
  }

  /**
   * Extrae observaciones de la respuesta AFIP
   */
  private extraerObservaciones(obs: any): string[] | undefined {
    if (!obs) return undefined;

    const lista = Array.isArray(obs.Obs) ? obs.Obs : [obs.Obs];
    return lista.map((o: any) => `[${o.Code}] ${o.Msg}`);
  }

  /**
   * Extrae errores de la respuesta AFIP
   */
  private extraerErrores(obs: any): string[] | undefined {
    if (!obs) return undefined;

    const lista = Array.isArray(obs.Obs) ? obs.Obs : [obs.Obs];
    return lista.map((o: any) => `[${o.Code}] ${o.Msg}`);
  }

  /**
   * Redondea a 2 decimales
   */
  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }
}

export default AFIPWSFEService;
