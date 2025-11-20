#!/usr/bin/env node

import dotenv from 'dotenv';
import Afip from '@afipsdk/afip.js';

dotenv.config();

const config = {
  CUIT: process.env.AFIP_CUIT,
  access_token: process.env.SDK_ACCESS_TOKEN,
  cert: process.env.AFIP_CERT_PATH,
  key: process.env.AFIP_KEY_PATH,
  production: false,
  ta_folder: process.env.AFIP_TA_FOLDER
};

console.log('\n🔍 TEST SIMPLE DE AUTENTICACIÓN AFIP\n');
console.log('Configuración:');
console.log(`  CUIT: ${config.CUIT}`);
console.log(`  Punto de venta: ${process.env.AFIP_PUNTO_VENTA}`);
console.log(`  Ambiente: HOMOLOGACIÓN`);
console.log();

async function test() {
  try {
    console.log('Creando instancia de Afip...');
    const afip = new Afip(config);
    
    console.log('✅ Instancia creada');
    console.log();
    
    console.log('Consultando estado del servidor...');
    const estado = await afip.ElectronicBilling.getServerStatus();
    console.log('✅ Servidor OK');
    console.log(`   App: ${estado.AppServer}, DB: ${estado.DbServer}, Auth: ${estado.AuthServer}`);
    console.log();
    
    console.log('Intentando autenticar y obtener último comprobante...');
    const ultimo = await afip.ElectronicBilling.getLastVoucher(1, 6);
    
    console.log('✅✅✅ ¡AUTENTICACIÓN EXITOSA! ✅✅✅');
    console.log();
    console.log(`Último comprobante tipo 6 (Factura B): ${ultimo}`);
    console.log();
    console.log('🎉 TODO FUNCIONA CORRECTAMENTE');
    console.log('   Ya puedes crear facturas de prueba con:');
    console.log('   npm run afip:test-completo 1');
    console.log();
    
  } catch (error) {
    console.log('❌ ERROR');
    console.log();
    console.log('Mensaje:', error.message);
    console.log();
    
    if (error.message.includes('400')) {
      console.log('💡 Error 400 - Posibles causas:');
      console.log('   1. La autorización del certificado "kurt" aún no está activa');
      console.log('   2. Espera 10-15 minutos y vuelve a intentar');
      console.log('   3. Verifica en WSASS que la autorización esté creada');
      console.log('   4. URL: https://wsass-homo.afip.gob.ar/wsass/portal/main.aspx');
    }
    console.log();
  }
}

test();
