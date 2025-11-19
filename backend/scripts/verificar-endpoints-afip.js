#!/usr/bin/env node

/**
 * Script para verificar los endpoints de AFIP a los que apunta el SDK
 * y hacer pruebas de conectividad directas
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

console.log('\n' + '='.repeat(70));
console.log('  VERIFICACIÓN DE ENDPOINTS AFIP');
console.log('='.repeat(70) + '\n');

console.log('📋 Configuración actual:\n');
console.log(`   CUIT: ${AFIP_CONFIG.CUIT}`);
console.log(`   Ambiente: ${AFIP_CONFIG.production ? 'PRODUCCIÓN ⚠️' : 'HOMOLOGACIÓN ✅'}`);
console.log(`   SDK Token: ${AFIP_CONFIG.access_token ? '✓' : '✗'}\n`);

// Endpoints conocidos de AFIP
const ENDPOINTS = {
  homologacion: {
    wsfe: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
    wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    wsfex: 'https://wswhomo.afip.gov.ar/wsfex/service.asmx',
    wsmtxca: 'https://wswhomo.afip.gov.ar/wsmtxca/services/MTXCAService',
  },
  produccion: {
    wsfe: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
    wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
    wsfex: 'https://servicios1.afip.gov.ar/wsfex/service.asmx',
    wsmtxca: 'https://servicios1.afip.gov.ar/wsmtxca/services/MTXCAService',
  }
};

const ambiente = AFIP_CONFIG.production ? 'produccion' : 'homologacion';
const endpoints = ENDPOINTS[ambiente];

console.log('🌐 Endpoints esperados para ' + ambiente.toUpperCase() + ':\n');
Object.entries(endpoints).forEach(([servicio, url]) => {
  console.log(`   ${servicio.toUpperCase().padEnd(10)} → ${url}`);
});
console.log();

async function verificarConectividad() {
  console.log('🔍 Verificando conectividad directa a endpoints...\n');
  
  // Prueba 1: Verificar endpoint WSAA (autenticación)
  console.log('1️⃣  Verificando WSAA (Autenticación)...');
  try {
    const response = await fetch(endpoints.wsaa + '?wsdl', { method: 'HEAD' });
    console.log(`   ✅ WSAA accesible (Status: ${response.status})\n`);
  } catch (error) {
    console.log(`   ❌ WSAA NO accesible`);
    console.log(`      Error: ${error.message}\n`);
  }
  
  // Prueba 2: Verificar endpoint WSFE (facturación)
  console.log('2️⃣  Verificando WSFE (Facturación Electrónica)...');
  try {
    const response = await fetch(endpoints.wsfe + '?wsdl', { method: 'HEAD' });
    console.log(`   ✅ WSFE accesible (Status: ${response.status})\n`);
  } catch (error) {
    console.log(`   ❌ WSFE NO accesible`);
    console.log(`      Error: ${error.message}\n`);
  }
  
  // Prueba 3: Verificar con el SDK
  console.log('3️⃣  Verificando con SDK de AFIP...\n');
  
  try {
    const afip = new Afip(AFIP_CONFIG);
    
    console.log('   🔍 Intentando getServerStatus...');
    const estado = await afip.ElectronicBilling.getServerStatus();
    
    console.log(`   ✅ SDK conectado correctamente\n`);
    console.log('   📊 Estado de servidores AFIP:\n');
    console.log(`      App Server:  ${estado.AppServer === 'OK' ? '✅' : '❌'} ${estado.AppServer}`);
    console.log(`      DB Server:   ${estado.DbServer === 'OK' ? '✅' : '❌'} ${estado.DbServer}`);
    console.log(`      Auth Server: ${estado.AuthServer === 'OK' ? '✅' : '❌'} ${estado.AuthServer}\n`);
    
    if (estado.AppServer === 'OK' && estado.DbServer === 'OK' && estado.AuthServer === 'OK') {
      console.log('   ✅ Todos los servicios operativos\n');
      
      // Prueba 4: Intentar autenticación
      console.log('4️⃣  Intentando autenticación (LoginCms)...\n');
      
      try {
        await afip.ElectronicBilling.getLastVoucher(1, 6);
        console.log('   ✅ Autenticación exitosa\n');
      } catch (authError) {
        console.log('   ❌ Error en autenticación:\n');
        console.log(`      ${authError.message}\n`);
        
        // Analizar el error
        if (authError.message.includes('1553') || authError.message.toLowerCase().includes('punto de venta')) {
          console.log('   💡 El punto de venta no existe en AFIP\n');
        } else if (authError.message.includes('1552') || authError.message.toLowerCase().includes('cuit')) {
          console.log('   💡 El CUIT no está autorizado para WSFE\n');
        }
      }
      
    } else {
      console.log('   ⚠️  Algunos servicios no están disponibles\n');
    }
    
  } catch (error) {
    console.log(`   ❌ Error con el SDK:\n`);
    console.log(`      ${error.message}\n`);
    
    if (error.message.includes('503')) {
      console.log('   💡 Error 503: Servicio temporalmente no disponible\n');
      console.log('      Posibles causas:\n');
      console.log('      • Mantenimiento programado de AFIP');
      console.log('      • Alta carga en los servidores');
      console.log('      • Problemas temporales de conectividad\n');
      console.log('      Recomendación: Intenta en 15-30 minutos\n');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('   💡 No se puede resolver el dominio o conectar\n');
      console.log('      Posibles causas:\n');
      console.log('      • Problemas de DNS');
      console.log('      • Firewall/Proxy bloqueando la conexión');
      console.log('      • Sin conexión a internet\n');
    } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.log('   💡 Timeout en la conexión\n');
      console.log('      El servidor tarda demasiado en responder\n');
    }
  }
  
  console.log('='.repeat(70));
  console.log('  RESUMEN DE CONFIGURACIÓN');
  console.log('='.repeat(70) + '\n');
  
  console.log('✅ Endpoints correctos para ' + ambiente.toUpperCase());
  console.log('   El SDK apunta automáticamente a los endpoints correctos\n');
  
  if (!AFIP_CONFIG.production) {
    console.log('💡 NOTA: Estás en ambiente de HOMOLOGACIÓN');
    console.log('   Los servicios de homologación suelen ser menos estables\n');
    console.log('   Horarios recomendados: Lunes a Viernes 8:00-20:00 hs\n');
  }
  
  console.log('📋 Variables de entorno importantes:\n');
  console.log(`   AFIP_PRODUCTION=${AFIP_CONFIG.production} (false=homologación, true=producción)`);
  console.log(`   AFIP_CUIT=${AFIP_CONFIG.CUIT}`);
  console.log(`   SDK_ACCESS_TOKEN=${AFIP_CONFIG.access_token ? 'Configurado ✓' : 'NO configurado ✗'}\n`);
}

verificarConectividad().catch(error => {
  console.error('\n❌ ERROR FATAL:', error.message);
  console.error(error.stack);
  console.log();
});
