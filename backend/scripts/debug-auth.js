#!/usr/bin/env node

/**
 * Script de debug para autenticación AFIP
 * Muestra información detallada del error
 */

import dotenv from 'dotenv';
import Afip from '@afipsdk/afip.js';

dotenv.config();

const AFIP_CONFIG = {
  CUIT: process.env.AFIP_CUIT || '',
  access_token: process.env.SDK_ACCESS_TOKEN || '',
  cert: process.env.AFIP_CERT_PATH || './certs/cert.crt',
  key: process.env.AFIP_KEY_PATH || './certs/private.key',
  production: false,
  ta_folder: process.env.AFIP_TA_FOLDER || './afip_tokens'
};

console.log('\n🔍 DEBUG AUTENTICACIÓN AFIP\n');
console.log('Configuración:');
console.log(`  CUIT: ${AFIP_CONFIG.CUIT}`);
console.log(`  Ambiente: HOMOLOGACIÓN`);
console.log(`  Cert: ${AFIP_CONFIG.cert}`);
console.log(`  Key: ${AFIP_CONFIG.key}`);
console.log();

async function debug() {
  try {
    console.log('Paso 1: Creando instancia de Afip...');
    const afip = new Afip(AFIP_CONFIG);
    console.log('✅ Instancia creada\n');
    
    console.log('Paso 2: Consultando estado del servidor...');
    const estado = await afip.ElectronicBilling.getServerStatus();
    console.log('✅ Servidor OK:', estado);
    console.log();
    
    console.log('Paso 3: Intentando obtener Token de Acceso...');
    console.log('(Esto requiere autenticación con certificado)\n');
    
    // Intentar obtener último comprobante (requiere autenticación)
    const ultimo = await afip.ElectronicBilling.getLastVoucher(1, 6);
    console.log('✅ Autenticación exitosa!');
    console.log(`   Último comprobante tipo 6: ${ultimo}`);
    
  } catch (error) {
    console.log('\n❌ ERROR:\n');
    console.log('Mensaje:', error.message);
    console.log();
    
    if (error.response) {
      console.log('HTTP Status:', error.response.status);
      console.log('HTTP Status Text:', error.response.statusText);
      console.log();
      
      if (error.response.data) {
        console.log('Response Data:');
        console.log(JSON.stringify(error.response.data, null, 2));
        console.log();
      }
      
      if (error.response.headers) {
        console.log('Response Headers:');
        console.log(error.response.headers);
        console.log();
      }
    }
    
    console.log('Stack:');
    console.log(error.stack);
    console.log();
    
    console.log('💡 Análisis del error:');
    
    if (error.message.includes('400')) {
      console.log('\nError 400 - Bad Request');
      console.log('Esto generalmente significa:');
      console.log('  1. El certificado no está correctamente asociado con el alias "kurt"');
      console.log('  2. La autorización WSFE con alias "kurt" no está activa');
      console.log('  3. Hay un problema con los parámetros de la solicitud');
      console.log();
      console.log('✅ Soluciones:');
      console.log('  1. Verifica en AFIP que la autorización con alias "kurt" esté activa');
      console.log('  2. Espera 10-15 minutos si acabas de crear la autorización');
      console.log('  3. Intenta eliminar la carpeta afip_tokens/ y vuelve a intentar');
    }
  }
}

debug();
