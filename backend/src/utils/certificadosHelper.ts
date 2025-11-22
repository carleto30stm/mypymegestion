/**
 * Helper para cargar certificados AFIP
 * Soporta tanto archivos locales como variables de entorno (Railway)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CertificadoConfig {
  cert: string;
  key: string;
}

/**
 * Carga certificados AFIP desde variables de entorno o archivos
 * 
 * Prioridad:
 * 1. Variables de entorno AFIP_CERT y AFIP_KEY (Railway/Cloud)
 * 2. Archivos en rutas especificadas por AFIP_CERT_PATH y AFIP_KEY_PATH
 * 3. Archivos en ./certs/cert.crt y ./certs/private.key (local)
 * 
 * @returns Objeto con contenido del certificado y clave privada
 * @throws Error si no se encuentran los certificados
 */
export function cargarCertificadosAFIP(): CertificadoConfig {
  let cert: string;
  let key: string;

  // Opción 1: Variables de entorno directas (Railway - preferido)
  if (process.env.AFIP_CERT && process.env.AFIP_KEY) {
    console.log('✅ Usando certificados AFIP desde variables de entorno (Railway)');
    
    // Decodificar saltos de línea si están escapados
    cert = process.env.AFIP_CERT.replace(/\\n/g, '\n');
    key = process.env.AFIP_KEY.replace(/\\n/g, '\n');
    
    return { cert, key };
  }

  // Opción 2: Archivos (Local - fallback)
  console.log('⚠️  Variables AFIP_CERT/AFIP_KEY no encontradas, buscando archivos...');
  
  const certPath = process.env.AFIP_CERT_PATH || join(process.cwd(), 'certs', 'cert.crt');
  const keyPath = process.env.AFIP_KEY_PATH || join(process.cwd(), 'certs', 'private.key');

  // Verificar existencia de archivos
  if (!existsSync(certPath)) {
    throw new Error(
      `Certificado AFIP no encontrado.\n` +
      `Buscado en: ${certPath}\n\n` +
      `Soluciones:\n` +
      `1. Local: Genera certificado con "npm run afip:generar-cert"\n` +
      `2. Railway: Configura variables AFIP_CERT y AFIP_KEY (usa "npm run afip:preparar-railway")`
    );
  }

  if (!existsSync(keyPath)) {
    throw new Error(
      `Clave privada AFIP no encontrada.\n` +
      `Buscado en: ${keyPath}\n\n` +
      `Soluciones:\n` +
      `1. Local: Genera certificado con "npm run afip:generar-cert"\n` +
      `2. Railway: Configura variables AFIP_CERT y AFIP_KEY (usa "npm run afip:preparar-railway")`
    );
  }

  console.log(`✅ Usando certificados AFIP desde archivos:`);
  console.log(`   Certificado: ${certPath}`);
  console.log(`   Clave: ${keyPath}`);

  try {
    cert = readFileSync(certPath, 'utf8');
    key = readFileSync(keyPath, 'utf8');
  } catch (error) {
    throw new Error(
      `Error al leer certificados AFIP: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return { cert, key };
}

/**
 * Valida que el contenido parezca un certificado válido
 */
export function validarCertificado(cert: string): boolean {
  return cert.includes('BEGIN CERTIFICATE') && cert.includes('END CERTIFICATE');
}

/**
 * Valida que el contenido parezca una clave privada válida
 */
export function validarClavePrivada(key: string): boolean {
  return (
    (key.includes('BEGIN RSA PRIVATE KEY') && key.includes('END RSA PRIVATE KEY')) ||
    (key.includes('BEGIN PRIVATE KEY') && key.includes('END PRIVATE KEY'))
  );
}
