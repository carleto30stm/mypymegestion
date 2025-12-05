/**
 * AFIP Padrón Service - Web Service de Consulta de Padrón A4
 * 
 * Este servicio consulta la condición fiscal real de un CUIT en AFIP.
 * Permite obtener:
 * - Condición IVA actual
 * - Tipo de persona (física/jurídica)
 * - Razón social / nombre
 * - Actividades
 * - Estado del contribuyente
 * 
 * @author Sistema myGestor
 * @version 1.0.0
 */

import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import AFIPWSAAService, { type WSAAConfig, type TicketAcceso } from './AFIPWSAAService.js';
import { CONDICION_IVA } from './AFIPWSFEService.js';

// URLs del servicio ws_sr_padron_a4 según ambiente
const PADRON_URLS = {
  production: 'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA4',
  homologacion: 'https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA4'
};

// Servicio a solicitar en WSAA
const PADRON_SERVICE = 'ws_sr_padron_a4';

export interface DatosPersonaAFIP {
  cuit: string;
  tipoPersona: 'FISICA' | 'JURIDICA';
  razonSocial?: string;       // Para personas jurídicas
  apellido?: string;          // Para personas físicas
  nombre?: string;            // Para personas físicas
  condicionIVA: number;       // Código numérico AFIP
  condicionIVADescripcion: string;
  estadoCuit: 'ACTIVO' | 'INACTIVO' | 'CANCELADO' | 'BAJA';
  fechaInscripcion?: string;
  domicilioFiscal?: {
    localidad?: string;
    provincia?: string;
    codigoPostal?: string;
    direccion?: string;
  };
  actividades?: Array<{
    codigo: string;
    descripcion: string;
    periodo?: string;
  }>;
}

export interface ResultadoConsultaPadron {
  encontrado: boolean;
  datos?: DatosPersonaAFIP;
  error?: string;
  // Para determinar tipo de factura
  tipoFacturaSugerido?: 'A' | 'B' | 'C';
  discriminaIVA?: boolean;
  usarDNIEnLugarDeCUIT?: boolean;
}

export interface PadronServiceConfig extends WSAAConfig {
  // Heredar configuración de WSAA
}

/**
 * Servicio para consultar el padrón A4 de AFIP
 */
export class AFIPPadronService {
  private config: PadronServiceConfig;
  private wsaaService: AFIPWSAAService;

  constructor(config: PadronServiceConfig) {
    this.config = config;
    this.wsaaService = new AFIPWSAAService(config);
  }

  /**
   * Consulta la condición fiscal de un CUIT en AFIP
   * 
   * NOTA: El padrón A4 solo se consulta en PRODUCCIÓN.
   * En homologación, AFIP no tiene datos reales de contribuyentes,
   * por lo que siempre se usa la inferencia por prefijo de CUIT.
   * 
   * @param cuitAConsultar - CUIT a consultar (puede tener guiones)
   * @returns Datos del contribuyente o error si no existe
   */
  async consultarCUIT(cuitAConsultar: string): Promise<ResultadoConsultaPadron> {
    try {
      // Limpiar CUIT (solo números)
      const cuitLimpio = cuitAConsultar.replace(/[^0-9]/g, '');
      
      if (cuitLimpio.length !== 11) {
        return {
          encontrado: false,
          error: 'CUIT inválido: debe tener 11 dígitos',
          usarDNIEnLugarDeCUIT: true
        };
      }

    //   console.log(`\n🔍 ========== CONSULTA PADRÓN AFIP A4 ==========`);
    //   console.log(`🔍 CUIT a consultar: ${cuitLimpio}`);
    //   console.log(`🔍 Ambiente: ${this.config.production ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN'}`);

      // En HOMOLOGACIÓN: usar siempre inferencia por prefijo
      // El padrón de homologación no tiene datos reales de contribuyentes
      if (!this.config.production) {
        console.log(`ℹ️  Ambiente de homologación - usando inferencia por prefijo (padrón no disponible)`);
        return this.inferirCondicionPorPrefijo(cuitLimpio);
      }

      // En PRODUCCIÓN: intentar consultar el padrón A4
      let ta: TicketAcceso;
      try {
        ta = await this.wsaaService.obtenerTicketAcceso(PADRON_SERVICE);
        console.log(`✅ Ticket de acceso obtenido para ${PADRON_SERVICE}`);
      } catch (authError: any) {
        // Si no se puede autenticar con el padrón, probablemente el servicio no está habilitado
        console.warn(`⚠️ No se pudo autenticar con ${PADRON_SERVICE}: ${authError.message}`);
        console.warn(`   → El servicio de padrón A4 requiere autorización especial en AFIP`);
        console.warn(`   → Usando inferencia por prefijo de CUIT como fallback`);
        
        return this.inferirCondicionPorPrefijo(cuitLimpio);
      }

      // Construir request SOAP
      const soapRequest = this.construirRequestConsulta(ta, cuitLimpio);

      // Enviar request
      const url = PADRON_URLS.production; // Siempre producción si llegamos aquí
      console.log(`📡 Enviando consulta a: ${url}`);

      const response = await axios.post(url, soapRequest, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': ''
        },
        timeout: 30000
      });

      // Parsear respuesta
      const resultado = await this.parsearRespuesta(response.data, cuitLimpio);
      
      console.log(`========== FIN CONSULTA PADRÓN ==========\n`);
      
      return resultado;

    } catch (error: any) {
      console.error(`❌ Error consultando padrón AFIP:`, error.message);
      
      // Si hay error de red o servicio, usar inferencia
      return this.inferirCondicionPorPrefijo(cuitAConsultar.replace(/[^0-9]/g, ''));
    }
  }

  /**
   * Construye el request SOAP para consultar el padrón
   */
  private construirRequestConsulta(ta: TicketAcceso, cuit: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:per="http://ws.sr.padron.afip.gov.ar">
  <soap:Header/>
  <soap:Body>
    <per:getPersona>
      <token>${ta.token}</token>
      <sign>${ta.sign}</sign>
      <cuitRepresentada>${this.config.cuit}</cuitRepresentada>
      <idPersona>${cuit}</idPersona>
    </per:getPersona>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Parsea la respuesta SOAP del padrón
   */
  private async parsearRespuesta(xmlResponse: string, cuitConsultado: string): Promise<ResultadoConsultaPadron> {
    try {
      const parsed = await parseStringPromise(xmlResponse, { explicitArray: false });
      
      // Navegar estructura SOAP
      const envelope = parsed['soap:Envelope'] || parsed['soapenv:Envelope'] || parsed.Envelope;
      const body = envelope['soap:Body'] || envelope['soapenv:Body'] || envelope.Body;
      const response = body.getPersonaResponse || body['per:getPersonaResponse'];
      
      if (!response) {
        // Verificar si hay error/fault
        const fault = body['soap:Fault'] || body.Fault;
        if (fault) {
          const faultString = fault.faultstring || fault.faultString || 'Error desconocido';
          console.log(`⚠️ AFIP Fault: ${faultString}`);
          return {
            encontrado: false,
            error: faultString,
            usarDNIEnLugarDeCUIT: true
          };
        }
        
        throw new Error('Respuesta SOAP inválida');
      }

      const personaReturn = response.personaReturn;
      
      // Verificar si hay error de persona no encontrada
      if (personaReturn.errorConstancia || personaReturn.errorRepadron) {
        const errorMsg = personaReturn.errorConstancia?.error || personaReturn.errorRepadron?.error || 'CUIT no encontrado';
        console.log(`⚠️ CUIT no encontrado en padrón: ${errorMsg}`);
        return {
          encontrado: false,
          error: errorMsg,
          usarDNIEnLugarDeCUIT: true,
          // Si no está en padrón, sugerir tratarlo como Consumidor Final
          tipoFacturaSugerido: 'B',
          discriminaIVA: false
        };
      }

      // Extraer datos de persona
      const persona = personaReturn.datosGenerales;
      const datosRegimenGeneral = personaReturn.datosRegimenGeneral;
      const datosMonotributo = personaReturn.datosMonotributo;

      // Determinar tipo de persona
      const tipoPersona = persona.tipoPersona === 'JURIDICA' ? 'JURIDICA' : 'FISICA';

      // Determinar condición IVA
      let condicionIVA = CONDICION_IVA.CONSUMIDOR_FINAL; // Default
      let condicionIVADescripcion = 'Consumidor Final';

      if (datosRegimenGeneral) {
        // Es Responsable Inscripto o Exento
        const impuestoIVA = Array.isArray(datosRegimenGeneral.impuesto) 
          ? datosRegimenGeneral.impuesto.find((i: any) => i.idImpuesto === '30' || i.idImpuesto === 30)
          : datosRegimenGeneral.impuesto?.idImpuesto === '30' ? datosRegimenGeneral.impuesto : null;
        
        if (impuestoIVA) {
          condicionIVA = CONDICION_IVA.RESPONSABLE_INSCRIPTO;
          condicionIVADescripcion = 'Responsable Inscripto';
        }
      } else if (datosMonotributo) {
        // Es Monotributista
        condicionIVA = CONDICION_IVA.RESPONSABLE_MONOTRIBUTO;
        condicionIVADescripcion = 'Monotributista';
      }

      // Estado del CUIT
      const estadoCuit = persona.estadoCuit || 'ACTIVO';

      // Construir datos
      const datos: DatosPersonaAFIP = {
        cuit: cuitConsultado,
        tipoPersona,
        condicionIVA,
        condicionIVADescripcion,
        estadoCuit: estadoCuit as 'ACTIVO' | 'INACTIVO' | 'CANCELADO' | 'BAJA'
      };

      if (tipoPersona === 'JURIDICA') {
        datos.razonSocial = persona.razonSocial;
      } else {
        datos.apellido = persona.apellido;
        datos.nombre = persona.nombre;
      }

      // Domicilio fiscal
      if (persona.domicilioFiscal) {
        datos.domicilioFiscal = {
          localidad: persona.domicilioFiscal.localidad,
          provincia: persona.domicilioFiscal.descripcionProvincia,
          codigoPostal: persona.domicilioFiscal.codPostal,
          direccion: persona.domicilioFiscal.direccion
        };
      }

    //   console.log(`✅ CUIT encontrado en padrón AFIP`);
    //   console.log(`   → Tipo persona: ${tipoPersona}`);
    //   console.log(`   → Condición IVA: ${condicionIVADescripcion} (código ${condicionIVA})`);
    //   console.log(`   → Estado: ${estadoCuit}`);

      // Determinar tipo de factura sugerido (asumiendo que la empresa es RI)
      let tipoFacturaSugerido: 'A' | 'B' | 'C';
      let discriminaIVA: boolean;

      if (condicionIVA === CONDICION_IVA.RESPONSABLE_INSCRIPTO) {
        tipoFacturaSugerido = 'A';
        discriminaIVA = true;
      } else {
        tipoFacturaSugerido = 'B';
        discriminaIVA = true; // Factura B discrimina IVA pero no se lo pasa al cliente
      }

      return {
        encontrado: true,
        datos,
        tipoFacturaSugerido,
        discriminaIVA,
        usarDNIEnLugarDeCUIT: false
      };

    } catch (parseError: any) {
      console.error(`❌ Error parseando respuesta padrón:`, parseError.message);
      return {
        encontrado: false,
        error: `Error parseando respuesta: ${parseError.message}`,
        usarDNIEnLugarDeCUIT: true
      };
    }
  }

  /**
   * Fallback: Inferir condición IVA por prefijo de CUIT
   * Se usa cuando el servicio de padrón no está disponible
   */
  private inferirCondicionPorPrefijo(cuit: string): ResultadoConsultaPadron {
    console.log(`\n⚠️ Usando inferencia por prefijo (padrón no disponible)`);
    
    const cuitLimpio = cuit.replace(/[^0-9]/g, '');
    
    if (cuitLimpio.length !== 11) {
      return {
        encontrado: false,
        error: 'CUIT inválido',
        usarDNIEnLugarDeCUIT: true,
        tipoFacturaSugerido: 'B',
        discriminaIVA: false
      };
    }

    const prefijo = cuitLimpio.substring(0, 2);
    let condicionIVA: number;
    let condicionIVADescripcion: string;
    let tipoPersona: 'FISICA' | 'JURIDICA';

    if (prefijo === '30' || prefijo === '33') {
      // Persona jurídica - generalmente RI
      tipoPersona = 'JURIDICA';
      condicionIVA = CONDICION_IVA.RESPONSABLE_INSCRIPTO;
      condicionIVADescripcion = 'Responsable Inscripto (inferido)';
      console.log(`   → CUIT 30/33 = Persona Jurídica → RI`);
    } else if (prefijo === '20' || prefijo === '23' || prefijo === '27') {
      // Persona física - puede ser Monotributista, RI o CF
      // Sin consulta al padrón, NO PODEMOS SABER con certeza
      // Lo más seguro es tratarlo como Consumidor Final para evitar errores
      tipoPersona = 'FISICA';
      condicionIVA = CONDICION_IVA.CONSUMIDOR_FINAL;
      condicionIVADescripcion = 'Consumidor Final (inferido - sin acceso a padrón)';
      console.log(`   → CUIT 20/23/27 = Persona Física → CF (seguro)`);
    } else {
      tipoPersona = 'FISICA';
      condicionIVA = CONDICION_IVA.CONSUMIDOR_FINAL;
      condicionIVADescripcion = 'Consumidor Final (default)';
      console.log(`   → Prefijo desconocido → CF (default)`);
    }

    // Determinar tipo factura
    let tipoFacturaSugerido: 'A' | 'B' | 'C';
    if (condicionIVA === CONDICION_IVA.RESPONSABLE_INSCRIPTO) {
      tipoFacturaSugerido = 'A';
    } else {
      tipoFacturaSugerido = 'B';
    }

    // CRÍTICO: Para personas físicas sin consulta a padrón, usar DNI para evitar error 10015
    const usarDNIEnLugarDeCUIT = tipoPersona === 'FISICA' && condicionIVA === CONDICION_IVA.CONSUMIDOR_FINAL;

    console.log(`   → Tipo factura sugerido: ${tipoFacturaSugerido}`);
    console.log(`   → Usar DNI en lugar de CUIT: ${usarDNIEnLugarDeCUIT}`);

    return {
      encontrado: false, // No se consultó al padrón real
      datos: {
        cuit: cuitLimpio,
        tipoPersona,
        condicionIVA,
        condicionIVADescripcion,
        estadoCuit: 'ACTIVO' // Asumimos activo
      },
      tipoFacturaSugerido,
      discriminaIVA: true, // Facturas A y B discriminan IVA
      usarDNIEnLugarDeCUIT
    };
  }

  /**
   * Determina el tipo de factura basándose en consulta real a AFIP
   * 
   * @param cuitCliente - CUIT del cliente
   * @param empresaCondicionIVA - Condición IVA de la empresa emisora
   */
  async determinarTipoFactura(
    cuitCliente: string,
    empresaCondicionIVA: string
  ): Promise<{
    tipoFactura: 'A' | 'B' | 'C';
    condicionIVA: number;
    condicionIVADescripcion: string;
    discriminaIVA: boolean;
    usarDNIEnLugarDeCUIT: boolean;
    datosAFIP?: DatosPersonaAFIP;
  }> {
    // Normalizar condición de empresa
    const empresaNorm = empresaCondicionIVA.toUpperCase().replace(/\s+/g, '_');
    const empresaRI = empresaNorm === 'RESPONSABLE_INSCRIPTO' || empresaNorm === 'RESPONSABLE_INSCRITO';

    if (!empresaRI) {
      // Empresa no RI solo puede emitir tipo C
      return {
        tipoFactura: 'C',
        condicionIVA: CONDICION_IVA.CONSUMIDOR_FINAL,
        condicionIVADescripcion: 'N/A (empresa no RI)',
        discriminaIVA: false,
        usarDNIEnLugarDeCUIT: false
      };
    }

    // Consultar padrón AFIP
    const resultado = await this.consultarCUIT(cuitCliente);

    if (resultado.encontrado && resultado.datos) {
      // Tenemos datos reales de AFIP
      return {
        tipoFactura: resultado.tipoFacturaSugerido || 'B',
        condicionIVA: resultado.datos.condicionIVA,
        condicionIVADescripcion: resultado.datos.condicionIVADescripcion,
        discriminaIVA: resultado.discriminaIVA ?? true,
        usarDNIEnLugarDeCUIT: resultado.usarDNIEnLugarDeCUIT ?? false,
        datosAFIP: resultado.datos
      };
    }

    // Fallback con inferencia
    return {
      tipoFactura: resultado.tipoFacturaSugerido || 'B',
      condicionIVA: resultado.datos?.condicionIVA || CONDICION_IVA.CONSUMIDOR_FINAL,
      condicionIVADescripcion: resultado.datos?.condicionIVADescripcion || 'Consumidor Final',
      discriminaIVA: resultado.discriminaIVA ?? false,
      usarDNIEnLugarDeCUIT: resultado.usarDNIEnLugarDeCUIT ?? true
    };
  }
}

export default AFIPPadronService;
