#!/usr/bin/env node

/**
 * Script para verificar el estado de los servidores de AFIP
 * Útil cuando hay errores 503 o problemas de conectividad
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

console.log('\n🔍 Verificando estado de los servidores AFIP...\n');
console.log(`Ambiente: HOMOLOGACIÓN`);
console.log(`Fecha: ${new Date().toLocaleString('es-AR')}\n`);

async function verificarEstado() {
  const afip = new Afip(AFIP_CONFIG);
  
  let intentos = 0;
  const maxIntentos = 5;
  const intervalo = 3000; // 3 segundos
  
  while (intentos < maxIntentos) {
    intentos++;
    console.log(`Intento ${intentos}/${maxIntentos}...`);
    
    try {
      const estado = await afip.ElectronicBilling.getServerStatus();
      
      console.log('\n✅ SERVIDORES AFIP DISPONIBLES\n');
      console.log('┌─────────────────┬────────────┐');
      console.log('│ Servicio        │ Estado     │');
      console.log('├─────────────────┼────────────┤');
      console.log(`│ App Server      │ ${estado.AppServer === 'OK' ? '✅ OK     ' : '❌ Error  '} │`);
      console.log(`│ DB Server       │ ${estado.DbServer === 'OK' ? '✅ OK     ' : '❌ Error  '} │`);
      console.log(`│ Auth Server     │ ${estado.AuthServer === 'OK' ? '✅ OK     ' : '❌ Error  '} │`);
      console.log('└─────────────────┴────────────┘\n');
      
      if (estado.AppServer === 'OK' && estado.DbServer === 'OK' && estado.AuthServer === 'OK') {
        console.log('💡 Los servidores están operativos.');
        console.log('   Ahora puedes ejecutar: npm run afip:diagnostico\n');
        return true;
      } else {
        console.log('⚠️  Algunos servicios no están disponibles.\n');
        return false;
      }
      
    } catch (error) {
      const errorMsg = error.message || String(error);
      
      if (errorMsg.includes('503') || errorMsg.includes('Service Unavailable')) {
        console.log('   ❌ Error 503 - Servidor no disponible');
        
        if (intentos < maxIntentos) {
          console.log(`   ⏳ Reintentando en ${intervalo/1000} segundos...\n`);
          await new Promise(resolve => setTimeout(resolve, intervalo));
        } else {
          console.log('\n❌ SERVIDOR AFIP NO DISPONIBLE\n');
          console.log('📋 Detalles del error:');
          console.log(`   ${errorMsg}\n`);
          console.log('💡 POSIBLES CAUSAS:\n');
          console.log('   1. Mantenimiento programado de AFIP');
          console.log('   2. Problemas técnicos temporales');
          console.log('   3. Alta carga en los servidores\n');
          console.log('✅ SOLUCIONES:\n');
          console.log('   • Espera unos minutos y vuelve a intentar');
          console.log('   • Verifica el estado en: https://www.afip.gob.ar/');
          console.log('   • Los servidores suelen estar más estables:');
          console.log('     - Lunes a Viernes: 8:00 - 20:00 hs');
          console.log('     - Evita horarios pico (10:00-12:00, 15:00-17:00)\n');
          console.log('   • Ejecuta este script nuevamente:');
          console.log('     npm run afip:verificar-estado\n');
          return false;
        }
      } else if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
        console.log('   ❌ Error de conexión - No se puede alcanzar el servidor');
        console.log('\n💡 Verifica tu conexión a internet y proxy/firewall.\n');
        return false;
      } else if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
        console.log('   ❌ Timeout - El servidor no responde a tiempo');
        
        if (intentos < maxIntentos) {
          console.log(`   ⏳ Reintentando en ${intervalo/1000} segundos...\n`);
          await new Promise(resolve => setTimeout(resolve, intervalo));
        } else {
          console.log('\n⚠️  El servidor está tardando demasiado en responder.\n');
          console.log('   Intenta nuevamente más tarde.\n');
          return false;
        }
      } else {
        console.log(`   ❌ Error inesperado: ${errorMsg}\n`);
        return false;
      }
    }
  }
  
  return false;
}

verificarEstado().catch(error => {
  console.error('\n❌ ERROR FATAL:', error.message);
  console.error(error.stack);
  console.log();
});
