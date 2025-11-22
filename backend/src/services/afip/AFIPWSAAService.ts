/**
 * AFIP WSAA Service - Web Service de Autenticación y Autorización
 * 
 * Este servicio maneja la autenticación con AFIP mediante SOAP directo.
 * Genera y administra Tickets de Acceso (TA) necesarios para consumir
 * otros web services de AFIP (como WSFE).
 * 
 * @author Sistema myGestor
 * @version 2.0.0 - SOAP Directo (sin SDK comercial)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { asegurarCarpetaTokens } from '../../utils/certificadosHelper.js';

// URLs de WSAA según ambiente
const WSAA_URLS = {
  production: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
  homologacion: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms'
};

export interface TicketAcceso {
  token: string;
  sign: string;
  generationTime: string;
  expirationTime: string;
  service: string;
  destination: string;
}

export interface WSAAConfig {
  cuit: string;
  certPath: string;
  keyPath: string;
  production: boolean;
  taFolder?: string;
}

export class AFIPWSAAService {
  private config: WSAAConfig;
  private taFolder: string;

  constructor(config: WSAAConfig) {
    this.config = config;
    
    // Asegurar que la carpeta de tokens exista
    this.taFolder = asegurarCarpetaTokens(config.taFolder);
  }

  /**
   * Obtiene un Ticket de Acceso válido para un servicio
   * Reutiliza TAs en caché si todavía son válidos
   */
  async obtenerTicketAcceso(servicio: string = 'wsfe'): Promise<TicketAcceso> {
    // Verificar si existe un TA válido en caché
    const taCache = this.leerTACache(servicio);
    if (taCache && this.esTicketValido(taCache)) {
      console.log(`✅ Usando TA en caché para ${servicio} (expira: ${new Date(taCache.expirationTime).toLocaleString()})`);
      return taCache;
    }

    // Generar nuevo TA
    console.log(`🔄 Generando nuevo TA para ${servicio}...`);
    const ta = await this.generarNuevoTicket(servicio);
    
    // Guardar en caché
    this.guardarTACache(servicio, ta);
    
    return ta;
  }

  /**
   * Genera un nuevo Ticket de Acceso solicitándolo a AFIP
   */
  private async generarNuevoTicket(servicio: string): Promise<TicketAcceso> {
    try {
      // 1. Generar TRA (Ticket de Requerimiento de Acceso)
      const tra = this.generarTRA(servicio);
      
      // 2. Firmar TRA con certificado (formato CMS/PKCS#7)
      const traFirmado = await this.firmarTRA(tra);
      
      // 3. Enviar a WSAA y obtener TA
      const ta = await this.solicitarTAAlWSAA(traFirmado);
      
      return ta;
    } catch (error: any) {
      throw new Error(`Error al generar TA: ${error.message}`);
    }
  }

  /**
   * Genera un Ticket de Requerimiento de Acceso (XML)
   */
  private generarTRA(servicio: string): string {
    // Obtener hora actual en Argentina (UTC-3)
    const now = new Date();
    const argentinaOffset = -3 * 60; // Argentina es UTC-3
    const localOffset = now.getTimezoneOffset(); // Offset local en minutos
    const offsetDiff = (argentinaOffset - localOffset) * 60 * 1000;
    
    const nowArgentina = new Date(now.getTime() + offsetDiff);
    const expirationArgentina = new Date(nowArgentina.getTime() + 12 * 60 * 60 * 1000); // 12 horas
    
    // Formatear fechas según requerimiento AFIP (ISO 8601 con offset -03:00)
    const formatoAFIP = (fecha: Date): string => {
      const año = fecha.getUTCFullYear();
      const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getUTCDate()).padStart(2, '0');
      const horas = String(fecha.getUTCHours()).padStart(2, '0');
      const minutos = String(fecha.getUTCMinutes()).padStart(2, '0');
      const segundos = String(fecha.getUTCSeconds()).padStart(2, '0');
      return `${año}-${mes}-${dia}T${horas}:${minutos}:${segundos}-03:00`;
    };
    
    const generationTime = formatoAFIP(nowArgentina);
    const expirationTime = formatoAFIP(expirationArgentina);
    const uniqueId = Math.floor(nowArgentina.getTime() / 1000);
    
    const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${generationTime}</generationTime>
    <expirationTime>${expirationTime}</expirationTime>
  </header>
  <service>${servicio}</service>
</loginTicketRequest>`;

    return tra;
  }

  /**
   * Firma el TRA usando OpenSSL (formato CMS requerido por AFIP)
   */
  private async firmarTRA(tra: string): Promise<string> {
    // Asegurar que la carpeta existe antes de escribir
    if (!fs.existsSync(this.taFolder)) {
      fs.mkdirSync(this.taFolder, { recursive: true });
      console.log(`✅ Carpeta de tokens creada: ${this.taFolder}`);
    }
    
    const traFile = path.join(this.taFolder, 'tra_temp.xml');
    const traSignedFile = path.join(this.taFolder, 'tra_signed.tmp');
    
    try {
      // Escribir TRA temporal
      fs.writeFileSync(traFile, tra, 'utf8');
      
      // Firmar con OpenSSL usando formato CMS
      // AFIP requiere: CMS, SHA256, nodetach, formato DER
      const certPath = path.resolve(this.config.certPath);
      const keyPath = path.resolve(this.config.keyPath);
      
      const command = `openssl cms -sign -in "${traFile}" -signer "${certPath}" -inkey "${keyPath}" -nodetach -outform DER -out "${traSignedFile}"`;
      
      execSync(command, { stdio: 'pipe' });
      
      // Leer archivo firmado y codificar en base64
      const traSignedBuffer = fs.readFileSync(traSignedFile);
      const traSignedBase64 = traSignedBuffer.toString('base64');
      
      // Limpiar archivos temporales
      fs.unlinkSync(traFile);
      fs.unlinkSync(traSignedFile);
      
      return traSignedBase64;
    } catch (error: any) {
      // Limpiar archivos temporales en caso de error
      if (fs.existsSync(traFile)) fs.unlinkSync(traFile);
      if (fs.existsSync(traSignedFile)) fs.unlinkSync(traSignedFile);
      
      throw new Error(`Error al firmar TRA con OpenSSL: ${error.message}`);
    }
  }

  /**
   * Envía el TRA firmado al WSAA de AFIP y obtiene el TA
   */
  private async solicitarTAAlWSAA(traFirmado: string): Promise<TicketAcceso> {
    const wsaaUrl = this.config.production 
      ? WSAA_URLS.production 
      : WSAA_URLS.homologacion;
    
    // Construir mensaje SOAP
    const soapMessage = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${traFirmado}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;
    
    try {
      const response = await axios.post(wsaaUrl, soapMessage, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': ''
        },
        timeout: 30000
      });
      
      // Parsear respuesta SOAP
      const result = await parseStringPromise(response.data, { 
        explicitArray: false,
        ignoreAttrs: true 
      });
      
      // Navegar estructura SOAP (maneja múltiples formatos)
      const soapBody = result['soapenv:Envelope']?.['soapenv:Body'] || 
                       result['soap:Envelope']?.['soap:Body'] ||
                       result['Envelope']?.['Body'];
      
      if (!soapBody) {
        console.log('📄 Respuesta completa:', JSON.stringify(result, null, 2));
        throw new Error('Respuesta SOAP sin estructura válida');
      }
      
      // Verificar si hay error
      const fault = soapBody['soapenv:Fault'] || soapBody['soap:Fault'] || soapBody['Fault'];
      if (fault) {
        const faultCode = fault.faultcode;
        const faultString = fault.faultstring;
        
        // Manejar error específico de TA ya existente
        if (faultCode && faultCode.includes('alreadyAuthenticated')) {
          throw new Error(`AFIP ya generó un TA válido previamente. Espera a que expire o elimina el cache en ${this.taFolder}`);
        }
        
        throw new Error(`SOAP Fault [${faultCode}]: ${faultString}`);
      }
      
      // Extraer loginCmsReturn (intentar múltiples variantes de namespace)
      const loginReturn = soapBody['loginCmsReturn'] || 
                          soapBody['ns1:loginCmsReturn'] ||
                          soapBody['ns:loginCmsReturn'] ||
                          soapBody['loginCmsResponse']?.['loginCmsReturn'];
      
      if (!loginReturn) {
        console.log('📄 SOAP Body:', JSON.stringify(soapBody, null, 2));
        throw new Error('loginCmsReturn no encontrado en respuesta SOAP');
      }
      
      // Parsear XML interno del TA
      const taData = await parseStringPromise(loginReturn, {
        explicitArray: false,
        ignoreAttrs: true
      });
      
      const credentials = taData.loginTicketResponse.credentials;
      const header = taData.loginTicketResponse.header;
      
      const ta: TicketAcceso = {
        token: credentials.token,
        sign: credentials.sign,
        generationTime: header.generationTime,
        expirationTime: header.expirationTime,
        service: header.service,
        destination: header.destination
      };
      
      return ta;
    } catch (error: any) {
      if (error.response) {
        // Error HTTP del servidor
        const status = error.response.status;
        const data = error.response.data;
        
        // Intentar extraer detalle del error SOAP
        try {
          const errorResult = await parseStringPromise(data, {
            explicitArray: false,
            ignoreAttrs: true
          });
          
          const fault = errorResult['soapenv:Envelope']?.['soapenv:Body']?.['soapenv:Fault'];
          if (fault) {
            throw new Error(`AFIP Error [${fault.faultcode}]: ${fault.faultstring}`);
          }
        } catch (parseError) {
          // No se pudo parsear, lanzar error genérico
        }
        
        throw new Error(`Error HTTP ${status} al conectar con WSAA`);
      }
      
      throw error;
    }
  }

  /**
   * Lee un TA del caché en disco
   */
  private leerTACache(servicio: string): TicketAcceso | null {
    const taFile = path.join(this.taFolder, `TA-${servicio}.json`);
    
    if (!fs.existsSync(taFile)) {
      return null;
    }
    
    try {
      const taData = JSON.parse(fs.readFileSync(taFile, 'utf8'));
      return taData;
    } catch (error) {
      console.warn(`⚠️  Error al leer TA en caché para ${servicio}:`, error);
      return null;
    }
  }

  /**
   * Guarda un TA en el caché en disco
   */
  private guardarTACache(servicio: string, ta: TicketAcceso): void {
    // Asegurar que la carpeta existe antes de escribir
    if (!fs.existsSync(this.taFolder)) {
      fs.mkdirSync(this.taFolder, { recursive: true });
      console.log(`✅ Carpeta de tokens creada: ${this.taFolder}`);
    }
    
    const taFile = path.join(this.taFolder, `TA-${servicio}.json`);
    
    try {
      fs.writeFileSync(taFile, JSON.stringify(ta, null, 2), 'utf8');
      console.log(`💾 TA guardado en caché: ${taFile}`);
    } catch (error) {
      console.warn(`⚠️  No se pudo guardar TA en caché:`, error);
    }
  }

  /**
   * Verifica si un TA todavía es válido (con margen de seguridad de 1 hora)
   */
  private esTicketValido(ta: TicketAcceso): boolean {
    const expiration = new Date(ta.expirationTime);
    const now = new Date();
    const marginMs = 60 * 60 * 1000; // 1 hora de margen
    
    return (expiration.getTime() - now.getTime()) > marginMs;
  }

  /**
   * Limpia el caché de TAs (útil para debugging)
   */
  limpiarCache(servicio?: string): void {
    if (servicio) {
      const taFile = path.join(this.taFolder, `TA-${servicio}.json`);
      if (fs.existsSync(taFile)) {
        fs.unlinkSync(taFile);
        console.log(`🗑️  Cache de ${servicio} eliminado`);
      }
    } else {
      // Limpiar todos los TAs
      const files = fs.readdirSync(this.taFolder);
      files.filter(f => f.startsWith('TA-') && f.endsWith('.json'))
        .forEach(f => {
          fs.unlinkSync(path.join(this.taFolder, f));
        });
      console.log(`🗑️  Todo el cache de TAs eliminado`);
    }
  }
}

export default AFIPWSAAService;
