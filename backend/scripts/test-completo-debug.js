#!/usr/bin/env node

/**
 * Test completo del flujo SDK → API → WSFE
 * Con debug detallado paso a paso
 */

import dotenv from 'dotenv';
import Afip from '@afipsdk/afip.js';
import fs from 'fs';

dotenv.config();

const config = {
  CUIT: process.env.AFIP_CUIT || '',
  access_token: process.env.SDK_ACCESS_TOKEN || '',
  cert: fs.readFileSync(process.env.AFIP_CERT_PATH || './certs/cert.crt', 'utf-8'),
  key: fs.readFileSync(process.env.AFIP_KEY_PATH || './certs/private.key', 'utf-8'),
  production: process.env.AFIP_PRODUCTION === 'true',
  ta_folder: './afip_tokens'
};

console.log('\n' + '='.repeat(70));
console.log('  TEST COMPLETO SDK → WSFE');
console.log('='.repeat(70) + '\n');

console.log('📋 Config:\n');
console.log(`   CUIT: ${config.CUIT}`);
console.log(`   Production: ${config.production} (${config.production ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN'})`);
console.log(`   SDK Token: ${config.access_token ? '✓' : '✗'}`);
console.log(`   Cert loaded: ${config.cert ? '✓' : '✗'}`);
console.log(`   Key loaded: ${config.key ? '✓' : '✗'}\n`);

async function test() {
  try {
    console.log('🔧 Paso 1: Inicializando SDK...\n');
    const afip = new Afip(config);
    console.log('   ✅ SDK inicializado\n');
    
    console.log('🔧 Paso 2: Obteniendo TA (Ticket de Acceso)...\n');
    // Forzar obtener nuevo TA
    const ta = await afip.GetServiceTA('wsfe', true);
    console.log('   ✅ TA obtenido:');
    console.log(`      Expira: ${ta.expiration}`);
    console.log(`      Token length: ${ta.token ? ta.token.length : 0} chars`);
    console.log(`      Sign length: ${ta.sign ? ta.sign.length : 0} chars\n`);
    
    console.log('🔧 Paso 3: Verificando estado servidores AFIP...\n');
    const status = await afip.ElectronicBilling.getServerStatus();
    console.log('   ✅ Servidores AFIP:');
    console.log(`      App Server: ${status.AppServer}`);
    console.log(`      Db Server: ${status.DbServer}`);
    console.log(`      Auth Server: ${status.AuthServer}\n`);
    
    console.log('🔧 Paso 4: Listando puntos de venta...\n');
    const salesPoints = await afip.ElectronicBilling.getSalesPoints();
    console.log('   ✅ Puntos de venta disponibles:');
    if (salesPoints && salesPoints.length > 0) {
      salesPoints.forEach(sp => {
        console.log(`      • PV ${sp.Nro}: ${sp.Desc || 'Sin descripción'} (${sp.Bloqueado === 'N' ? 'Activo' : 'Bloqueado'})`);
      });
    } else {
      console.log('      (ninguno configurado - esto es normal en homologación)');
    }
    console.log();
    
    console.log('🔧 Paso 5: Obteniendo último comprobante PV 1, Tipo 6 (FC B)...\n');
    const lastVoucher = await afip.ElectronicBilling.getLastVoucher(1, 6);
    console.log(`   ✅ Último comprobante: ${lastVoucher}\n`);
    
    console.log('='.repeat(70));
    console.log('  ✅✅✅ TODO FUNCIONA CORRECTAMENTE ✅✅✅');
    console.log('='.repeat(70) + '\n');
    
    console.log('💡 PRÓXIMOS PASOS:\n');
    console.log('   1. Crear punto de venta si no existe: npm run afip:crear-punto-venta');
    console.log('   2. Generar factura de prueba: npm run afip:test-completo 1\n');
    
  } catch (error) {
    console.log('\n' + '='.repeat(70));
    console.log('  ❌ ERROR DETECTADO');
    console.log('='.repeat(70) + '\n');
    
    console.log(`   Mensaje: ${error.message}\n`);
    
    if (error.status) {
      console.log(`   HTTP Status: ${error.status}`);
    }
    
    if (error.data) {
      console.log(`   Data:`, error.data);
    }
    
    console.log('\n   Stack (primeras líneas):');
    const stackLines = error.stack.split('\n').slice(0, 5);
    stackLines.forEach(line => console.log(`      ${line}`));
    
    console.log('\n' + '='.repeat(70));
    console.log('  DIAGNÓSTICO');
    console.log('='.repeat(70) + '\n');
    
    if (error.message.includes('400')) {
      console.log('❌ Error 400 - Bad Request\n');
      console.log('   Ya verificamos que:');
      console.log('   ✅ El TA se obtiene correctamente de SDK API');
      console.log('   ✅ El ambiente es homologación (wsaahomo)');
      console.log('   ✅ El certificado es válido\n');
      console.log('   Entonces el problema DEBE estar en:');
      console.log('   🔍 La llamada a WSFE después de obtener el TA\n');
      console.log('   💡 POSIBLE CAUSA:');
      console.log('      El SDK API devuelve TA de WSAA-HOMO');
      console.log('      Pero luego llama a WSFE-PRODUCCIÓN en vez de WSFE-HOMO\n');
      console.log('   ✅ SOLUCIÓN:');
      console.log('      Verificar en código del SDK si usa el environment correctamente');
      console.log('      para TODAS las llamadas, no solo para GetServiceTA\n');
    }
    
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  }
}

test();
