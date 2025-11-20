#!/usr/bin/env node

/**
 * Test usando TA cacheado (sin forzar recreación)
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
console.log('  TEST CON TA CACHEADO (sin forzar renovación)');
console.log('='.repeat(70) + '\n');

async function test() {
  try {
    const afip = new Afip(config);
    
    console.log('✅ SDK inicializado\n');
    console.log('⏳ Obteniendo TA (usará cache si está vigente)...\n');
    
    // NO forzar (segundo parámetro = false o sin pasar)
    const ta = await afip.GetServiceTA('wsfe');
    
    console.log('✅ TA obtenido/cacheado:');
    console.log(`   Expira: ${ta.expiration}\n`);
    
    console.log('⏳ Probando getServerStatus...\n');
    const status = await afip.ElectronicBilling.getServerStatus();
    console.log('✅ Servidores:');
    console.log(`   App: ${status.AppServer}, DB: ${status.DbServer}, Auth: ${status.AuthServer}\n`);
    
    console.log('⏳ Probando getSalesPoints...\n');
    const salesPoints = await afip.ElectronicBilling.getSalesPoints();
    console.log(`✅ Puntos de venta: ${salesPoints ? salesPoints.length : 0}\n`);
    
    console.log('⏳ Probando getLastVoucher (PV 1, Tipo 6)...\n');
    const lastVoucher = await afip.ElectronicBilling.getLastVoucher(1, 6);
    console.log(`✅ Último comprobante: ${lastVoucher}\n`);
    
    console.log('='.repeat(70));
    console.log('  ✅✅✅ TODO FUNCIONA ✅✅✅');
    console.log('='.repeat(70) + '\n');
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}\n`);
    if (error.data) {
      console.log('Data:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

test();
