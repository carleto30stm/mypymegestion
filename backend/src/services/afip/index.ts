/**
 * AFIP Services - Barril de Exportaciones
 * 
 * Exporta todos los servicios SOAP de AFIP desde un único punto.
 * Usar estos servicios en lugar del SDK comercial (@afipsdk/afip.js)
 */

// Servicio de autenticación WSAA
export { 
  AFIPWSAAService,
  type TicketAcceso,
  type WSAAConfig
} from './AFIPWSAAService.js';

// Servicio de facturación WSFE
export {
  AFIPWSFEService,
  TIPO_COMPROBANTE,
  ALICUOTA_IVA,
  TIPO_DOCUMENTO,
  type ComprobanteDatos,
  type ResultadoCAE,
  type WSFEConfig
} from './AFIPWSFEService.js';

// Servicio facade unificado (API compatible con AFIPService original)
export {
  AFIPServiceSOAP,
  type AFIPConfig,
  type DatosFactura,
  type RespuestaCAE
} from './AFIPServiceSOAP.js';

// Servicio de consulta de padrón A4
export {
  AFIPPadronService,
  type DatosPersonaAFIP,
  type ResultadoConsultaPadron,
  type PadronServiceConfig
} from './AFIPPadronService.js';

// Re-exportar como default el servicio principal
export { default } from './AFIPServiceSOAP.js';
