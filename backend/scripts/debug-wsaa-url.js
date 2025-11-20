#!/usr/bin/env node

/**
 * Script para debuggear a qué URL exacta está llamando el SDK
 * para obtener el TA (Ticket de Acceso)
 */

import dotenv from 'dotenv';
import Afip from '@afipsdk/afip.js';

dotenv.config();

const AFIP_CONFIG = {
  CUIT: process.env.AFIP_CUIT || '',
  access_token: process.env.SDK_ACCESS_TOKEN || '',
  cert: process.env.AFIP_CERT_PATH || './certs/cert.crt',
  key: process.env.AFIP_KEY_PATH || './certs/private.key',
  production: process.env.AFIP_PRODUCTION === 'true',
  ta_folder: process.env.AFIP_TA_FOLDER || './afip_tokens'
};

console.log('\n' + '='.repeat(70));
console.log('  DEBUG: URLs WSAA que usa el SDK');
console.log('='.repeat(70) + '\n');

console.log('📋 Configuración detectada:\n');
console.log(`   AFIP_PRODUCTION = "${process.env.AFIP_PRODUCTION}"`);
console.log(`   production (parseado) = ${AFIP_CONFIG.production}`);
console.log(`   CUIT = ${AFIP_CONFIG.CUIT}`);
console.log(`   TA Folder = ${AFIP_CONFIG.ta_folder}\n`);

console.log('🌐 URLs esperadas:\n');

const WSAA_HOMO = 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';
const WSAA_PROD = 'https://wsaa.afip.gov.ar/ws/services/LoginCms';

console.log(`   HOMOLOGACIÓN: ${WSAA_HOMO}`);
console.log(`   PRODUCCIÓN:   ${WSAA_PROD}\n`);

console.log(`   SDK debería usar: ${AFIP_CONFIG.production ? 'PRODUCCIÓN ⚠️' : 'HOMOLOGACIÓN ✅'}\n`);

console.log('='.repeat(70));
console.log('  PRUEBA DE AUTENTICACIÓN');
console.log('='.repeat(70) + '\n');

// Patch axios para interceptar las URLs
const originalFetch = global.fetch;
const urlsCalled = [];

global.fetch = function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('wsaa')) {
    console.log('🔍 URL interceptada:');
    console.log(`   ${url}\n`);
    urlsCalled.push(url);
  }
  return originalFetch.apply(this, args);
};

async function testWSAA() {
  try {
    console.log('⏳ Intentando obtener TA con el SDK...\n');
    
    const afip = new Afip(AFIP_CONFIG);
    
    // Esto internamente llama a WSAA
    await afip.ElectronicBilling.getLastVoucher(1, 6);
    
    console.log('✅ TA obtenido exitosamente\n');
    
  } catch (error) {
    console.log('❌ Error al obtener TA:\n');
    console.log(`   ${error.message}\n`);
    
    if (error.response) {
      console.log('   Status HTTP:', error.response.status);
      console.log('   Status Text:', error.response.statusText, '\n');
    }
  }
  
  console.log('='.repeat(70));
  console.log('  DIAGNÓSTICO');
  console.log('='.repeat(70) + '\n');
  
  if (urlsCalled.length === 0) {
    console.log('⚠️  No se interceptaron llamadas a WSAA');
    console.log('   El SDK puede estar usando el TA cacheado\n');
    console.log('💡 Para forzar nueva autenticación, borra la carpeta:');
    console.log(`   ${AFIP_CONFIG.ta_folder}\n`);
  } else {
    console.log('📋 URLs llamadas por el SDK:\n');
    urlsCalled.forEach((url, i) => {
      console.log(`   ${i + 1}. ${url}`);
    });
    console.log();
    
    const usaHomo = urlsCalled.some(url => url.includes('wsaahomo'));
    const usaProd = urlsCalled.some(url => url.includes('wsaa.afip.gov.ar') && !url.includes('homo'));
    
    if (usaHomo && AFIP_CONFIG.production) {
      console.log('❌ PROBLEMA DETECTADO:');
      console.log('   SDK llama a HOMOLOGACIÓN pero AFIP_PRODUCTION=true\n');
      console.log('✅ SOLUCIÓN: Verificar .env → AFIP_PRODUCTION=false\n');
    } else if (usaProd && !AFIP_CONFIG.production) {
      console.log('❌ PROBLEMA DETECTADO:');
      console.log('   SDK llama a PRODUCCIÓN pero AFIP_PRODUCTION=false\n');
      console.log('✅ SOLUCIÓN: Verificar .env → AFIP_PRODUCTION=true\n');
    } else if (usaHomo && !AFIP_CONFIG.production) {
      console.log('✅ CORRECTO:');
      console.log('   SDK llama a HOMOLOGACIÓN según configuración\n');
    } else if (usaProd && AFIP_CONFIG.production) {
      console.log('✅ CORRECTO:');
      console.log('   SDK llama a PRODUCCIÓN según configuración\n');
    }
  }
  
  console.log('💡 VERIFICAR TAMBIÉN:\n');
  console.log('   1. Certificado en WSASS-HOMO: https://wsass-homo.afip.gob.ar');
  console.log('   2. Certificado en WSASS-PROD: https://wsass.afip.gov.ar');
  console.log('   3. Que el certificado esté asociado a "wsfe" en el ambiente correcto\n');
  
  console.log('='.repeat(70) + '\n');
}

testWSAA().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
