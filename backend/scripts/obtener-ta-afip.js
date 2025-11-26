#!/usr/bin/env node

/**
 * Script para obtener Ticket de Acceso (TA) de AFIP
 * SIN usar SDK comercial - Método oficial AFIP
 * 
 * Este script:
 * 1. Crea un Ticket de Requerimiento de Acceso (TRA) firmado
 * 2. Lo envía al Web Service de Autenticación y Autorización (WSAA)
 * 3. Obtiene el Ticket de Acceso (TA) con token y sign
 * 
 * Uso: node scripts/obtener-ta-afip.js
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseStringPromise } from 'xml2js';
import axios from 'axios';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

// Configuración
const CONFIG = {
  cuit: process.env.AFIP_CUIT,
  certPath: process.env.AFIP_CERT_PATH || './certs/cert.crt',
  keyPath: process.env.AFIP_KEY_PATH || './certs/private.key',
  service: 'wsfe', // Servicio de facturación electrónica
  production: process.env.AFIP_PRODUCTION === 'true',
  taFolder: process.env.AFIP_TA_FOLDER || './afip_tokens'
};

// URLs de WSAA (Web Service de Autenticación y Autorización)
const WSAA_URLS = {
  production: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
  homologacion: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms'
};

/**
 * Genera un Ticket de Requerimiento de Acceso (TRA)
 */
function generarTRA(service, cuit) {
  // Obtener hora actual en Argentina (UTC-3)
  const now = new Date();
  const argentinaOffset = -3 * 60; // Argentina es UTC-3
  const localOffset = now.getTimezoneOffset(); // Offset local en minutos
  const offsetDiff = (argentinaOffset - localOffset) * 60 * 1000;
  
  const nowArgentina = new Date(now.getTime() + offsetDiff);
  const expirationArgentina = new Date(nowArgentina.getTime() + 12 * 60 * 60 * 1000); // 12 horas
  
  // AFIP requiere formato ISO 8601 con offset de Argentina (-03:00)
  const formatoAFIP = (fecha) => {
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
  
  console.log(`   Hora generación TRA: ${generationTime}`);
  console.log(`   Hora expiración TRA: ${expirationTime}`);
  
  const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${generationTime}</generationTime>
    <expirationTime>${expirationTime}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;

  return tra;
}

/**
 * Firma el TRA con el certificado y clave privada
 */
function firmarTRA(tra, certPath, keyPath) {
  try {
    // Leer certificado y clave privada
    const cert = fs.readFileSync(path.resolve(certPath), 'utf8');
    const key = fs.readFileSync(path.resolve(keyPath), 'utf8');
    
    // Crear firma PKCS#7
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(tra);
    sign.end();
    
    // Firmar con la clave privada
    const signature = sign.sign(key, 'base64');
    
    // Crear estructura PKCS#7 en formato PEM
    const p7 = `-----BEGIN PKCS7-----
${signature}
-----END PKCS7-----`;
    
    // Para AFIP necesitamos crear un CMS (Cryptographic Message Syntax)
    // Usamos OpenSSL para esto
    const traFile = path.join(CONFIG.taFolder, 'tra.xml');
    const traSignedFile = path.join(CONFIG.taFolder, 'tra.tmp');
    
    // Crear carpeta si no existe
    if (!fs.existsSync(CONFIG.taFolder)) {
      fs.mkdirSync(CONFIG.taFolder, { recursive: true });
    }
    
    // Guardar TRA temporal
    fs.writeFileSync(traFile, tra);
    
    // Firmar con OpenSSL (formato CMS requerido por AFIP)
    // AFIP requiere: SHA256, nodetach, outform DER
    // En Windows buscamos OpenSSL en ubicaciones comunes
    let opensslCmd = 'openssl';
    if (process.platform === 'win32') {
      const possiblePaths = [
        'C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.exe',
        'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
        'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe',
        'openssl',
        'OpenSSL'
      ];
      for (const p of possiblePaths) {
        try {
          execSync(`"${p}" version`, { stdio: 'pipe' });
          opensslCmd = `"${p}"`;
          break;
        } catch { /* continuar */ }
      }
    }
    const command = `${opensslCmd} cms -sign -in "${traFile}" -signer "${path.resolve(certPath)}" -inkey "${path.resolve(keyPath)}" -nodetach -outform DER -out "${traSignedFile}"`;
    
    try {
      execSync(command, { stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Error al firmar con OpenSSL: ${error.message}`);
    }
    
    // Leer archivo firmado
    const traSignedBuffer = fs.readFileSync(traSignedFile);
    const traSignedBase64 = traSignedBuffer.toString('base64');
    
    // Limpiar archivos temporales
    fs.unlinkSync(traFile);
    fs.unlinkSync(traSignedFile);
    
    return traSignedBase64;
    
  } catch (error) {
    throw new Error(`Error al firmar TRA: ${error.message}`);
  }
}

/**
 * Crea el mensaje SOAP para el WSAA
 */
function crearMensajeSOAP(traSignedBase64) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${traSignedBase64}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Envía el TRA firmado al WSAA y obtiene el TA
 */
async function obtenerTA(traSignedBase64, production = false) {
  const wsaaUrl = production ? WSAA_URLS.production : WSAA_URLS.homologacion;
  const soapMessage = crearMensajeSOAP(traSignedBase64);
  
  console.log('📤 Enviando solicitud a WSAA...');
  console.log(`   URL: ${wsaaUrl}\n`);
  
  try {
    const response = await axios.post(wsaaUrl, soapMessage, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': ''
      },
      timeout: 30000
    });
    
    // Parsear respuesta XML
    const result = await parseStringPromise(response.data, { 
      explicitArray: false,
      ignoreAttrs: true 
    });
    
    console.log('📥 Respuesta SOAP recibida\n');
    
    // Navegar por la estructura SOAP
    const soapBody = result['soapenv:Envelope']?.['soapenv:Body'] || 
                     result['soap:Envelope']?.['soap:Body'] ||
                     result['Envelope']?.['Body'];
    
    if (!soapBody) {
      console.error('❌ Estructura SOAP inválida');
      console.log('Respuesta completa:', JSON.stringify(result, null, 2));
      throw new Error('Respuesta SOAP no tiene estructura esperada');
    }
    
    // Verificar si hay un fault
    if (soapBody['soapenv:Fault'] || soapBody['soap:Fault'] || soapBody['Fault']) {
      const fault = soapBody['soapenv:Fault'] || soapBody['soap:Fault'] || soapBody['Fault'];
      throw new Error(`SOAP Fault: ${fault.faultstring || fault.faultString}`);
    }
    
    // Extraer loginCmsReturn - puede estar en diferentes rutas según la respuesta
    const loginReturn = soapBody['loginCmsReturn'] || 
                        soapBody['ns1:loginCmsReturn'] ||
                        soapBody['loginCmsResponse']?.['loginCmsReturn'];
    
    if (!loginReturn) {
      console.error('❌ No se encontró loginCmsReturn en respuesta');
      console.log('SOAP Body:', JSON.stringify(soapBody, null, 2));
      throw new Error('loginCmsReturn no encontrado en respuesta SOAP');
    }
    
    // Parsear el XML interno (loginCmsReturn)
    const taData = await parseStringPromise(loginReturn, {
      explicitArray: false,
      ignoreAttrs: true
    });
    
    const credentials = taData.loginTicketResponse.credentials;
    const header = taData.loginTicketResponse.header;
    
    const ta = {
      token: credentials.token,
      sign: credentials.sign,
      generationTime: header.generationTime,
      expirationTime: header.expirationTime,
      service: header.service,
      destination: header.destination
    };
    
    return ta;
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Error en respuesta de WSAA:');
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
      
      // Intentar parsear el error SOAP
      try {
        const errorResult = await parseStringPromise(error.response.data, {
          explicitArray: false,
          ignoreAttrs: true
        });
        
        const fault = errorResult['soapenv:Envelope']['soapenv:Body']['soapenv:Fault'];
        if (fault) {
          console.error('\n📋 Detalle del error SOAP:');
          console.error('   Código:', fault.faultcode);
          console.error('   Mensaje:', fault.faultstring);
        }
      } catch (parseError) {
        // No se pudo parsear el error
      }
    }
    
    throw new Error(`Error al obtener TA: ${error.message}`);
  }
}

/**
 * Guarda el TA en archivo para reutilización
 */
function guardarTA(ta, service) {
  const taFile = path.join(CONFIG.taFolder, `TA-${service}.json`);
  
  if (!fs.existsSync(CONFIG.taFolder)) {
    fs.mkdirSync(CONFIG.taFolder, { recursive: true });
  }
  
  fs.writeFileSync(taFile, JSON.stringify(ta, null, 2));
  console.log(`\n💾 TA guardado en: ${taFile}`);
}

/**
 * Verifica si existe un TA válido guardado
 */
function leerTAGuardado(service) {
  const taFile = path.join(CONFIG.taFolder, `TA-${service}.json`);
  
  if (!fs.existsSync(taFile)) {
    return null;
  }
  
  try {
    const taData = JSON.parse(fs.readFileSync(taFile, 'utf8'));
    const expiration = new Date(taData.expirationTime);
    const now = new Date();
    
    // Verificar si el TA todavía es válido (con 1 hora de margen)
    const marginMs = 60 * 60 * 1000; // 1 hora
    if (expiration.getTime() - now.getTime() > marginMs) {
      return taData;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Muestra información del TA
 */
function mostrarInfoTA(ta) {
  console.log('\n✅ Ticket de Acceso (TA) obtenido exitosamente!\n');
  console.log('📋 Información del TA:');
  console.log(`   Servicio: ${ta.service}`);
  console.log(`   Destino: ${ta.destination}`);
  console.log(`   Generado: ${new Date(ta.generationTime).toLocaleString('es-AR')}`);
  console.log(`   Expira: ${new Date(ta.expirationTime).toLocaleString('es-AR')}`);
  console.log(`\n   Token (primeros 50 chars): ${ta.token.substring(0, 50)}...`);
  console.log(`   Sign (primeros 50 chars): ${ta.sign.substring(0, 50)}...`);
}

/**
 * Main
 */
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  Obtener Ticket de Acceso (TA) - AFIP WSAA');
  console.log('  Ambiente:', CONFIG.production ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN');
  console.log('='.repeat(70) + '\n');
  
  try {
    // Verificar configuración
    if (!CONFIG.cuit) {
      throw new Error('AFIP_CUIT no configurado en .env');
    }
    
    if (!fs.existsSync(CONFIG.certPath)) {
      throw new Error(`Certificado no encontrado: ${CONFIG.certPath}`);
    }
    
    if (!fs.existsSync(CONFIG.keyPath)) {
      throw new Error(`Clave privada no encontrada: ${CONFIG.keyPath}`);
    }
    
    console.log('🔧 Configuración:');
    console.log(`   CUIT: ${CONFIG.cuit}`);
    console.log(`   Servicio: ${CONFIG.service}`);
    console.log(`   Certificado: ${CONFIG.certPath}`);
    console.log(`   Clave privada: ${CONFIG.keyPath}`);
    console.log();
    
    // Verificar si existe un TA válido
    const taGuardado = leerTAGuardado(CONFIG.service);
    if (taGuardado) {
      console.log('ℹ️  TA válido encontrado en caché');
      mostrarInfoTA(taGuardado);
      console.log('\n💡 Usa --force para generar un nuevo TA');
      console.log('\n' + '='.repeat(70) + '\n');
      return;
    }
    
    console.log('📝 Generando Ticket de Requerimiento de Acceso (TRA)...');
    const tra = generarTRA(CONFIG.service, CONFIG.cuit);
    console.log('   ✅ TRA generado\n');
    
    console.log('🔐 Firmando TRA con certificado...');
    const traSignedBase64 = firmarTRA(tra, CONFIG.certPath, CONFIG.keyPath);
    console.log('   ✅ TRA firmado (CMS/PKCS#7)\n');
    
    console.log('🌐 Solicitando TA al WSAA de AFIP...');
    const ta = await obtenerTA(traSignedBase64, CONFIG.production);
    
    // Guardar TA
    guardarTA(ta, CONFIG.service);
    
    // Mostrar información
    mostrarInfoTA(ta);
    
    console.log('\n' + '='.repeat(70));
    console.log('  ✅ PROCESO COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(70) + '\n');
    
    console.log('📝 Próximos pasos:');
    console.log('   1. El TA es válido por 12 horas');
    console.log('   2. Úsalo para autorizar facturas con wsfe');
    console.log('   3. Este script regenerará el TA automáticamente cuando expire\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.message.includes('OpenSSL')) {
      console.log('\n💡 Asegúrate de tener OpenSSL instalado:');
      console.log('   Windows: https://slproweb.com/products/Win32OpenSSL.html');
      console.log('   O usa: choco install openssl');
    }
    
    if (error.message.includes('400') || error.message.includes('500')) {
      console.log('\n💡 Error del servidor AFIP. Verifica:');
      console.log('   1. Certificado registrado en portal AFIP');
      console.log('   2. CUIT autorizado para el servicio wsfe');
      console.log('   3. Certificado válido y no expirado');
      console.log('\n🔧 Portal AFIP homologación:');
      console.log('   https://auth.afip.gob.ar/contribuyente_/login.xhtml');
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    process.exit(1);
  }
}

// Agregar soporte para --force
if (process.argv.includes('--force')) {
  const taFile = path.join(CONFIG.taFolder, `TA-${CONFIG.service}.json`);
  if (fs.existsSync(taFile)) {
    fs.unlinkSync(taFile);
    console.log('🗑️  TA anterior eliminado\n');
  }
}

main();
