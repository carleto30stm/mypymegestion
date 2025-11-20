#!/usr/bin/env node

/**
 * Test directo de getLastVoucher (no requiere PV creado previamente)
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
console.log('  TEST ÚLTIMO COMPROBANTE');
console.log('='.repeat(70) + '\n');

async function test() {
  try {
    const afip = new Afip(config);
    
    console.log('⏳ Obteniendo último comprobante...');
    console.log('   Punto de venta: 1');
    console.log('   Tipo comprobante: 6 (Factura B)\n');
    
    const lastVoucher = await afip.ElectronicBilling.getLastVoucher(1, 6);
    
    console.log('='.repeat(70));
    console.log('  ✅ ÉXITO');
    console.log('='.repeat(70) + '\n');
    console.log(`   Último número: ${lastVoucher}\n`);
    console.log('💡 Esto significa que puedes generar la factura número:', lastVoucher + 1);
    console.log('\n='.repeat(70) + '\n');
    
  } catch (error) {
    console.log('\n' + '='.repeat(70));
    console.log('  RESULTADO');
    console.log('='.repeat(70) + '\n');
    console.log(`   Error: ${error.message}\n`);
    
    if (error.message.includes('602')) {
      console.log('   ⚠️  Error 602 = Sin resultados\n');
      console.log('   Esto es NORMAL si:');
      console.log('   • No hay comprobantes previos en este PV');
      console.log('   • El PV no existe aún en AFIP\n');
      console.log('   ✅ La autenticación FUNCIONA correctamente\n');
      console.log('   💡 SIGUIENTE PASO:');
      console.log('      Intentar generar una factura de prueba:');
      console.log('      npm run afip:test-completo 1\n');
      process.exit(0);
    }
    
    if (error.data) {
      console.log('   Data:', JSON.stringify(error.data, null, 2), '\n');
    }
    
    console.log('='.repeat(70) + '\n');
  }
}

test();
