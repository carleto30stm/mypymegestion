#!/usr/bin/env node

/**
 * Script para listar puntos de venta disponibles en AFIP
 * Útil para saber qué puntos de venta están configurados
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

console.log('\n📋 Consultando puntos de venta disponibles en AFIP...\n');
console.log(`CUIT: ${AFIP_CONFIG.CUIT}`);
console.log(`Ambiente: HOMOLOGACIÓN\n`);

async function listarPuntosVenta() {
  const afip = new Afip(AFIP_CONFIG);
  
  try {
    const puntosVenta = await afip.ElectronicBilling.getSalesPoints();
    
    if (!puntosVenta || puntosVenta.length === 0) {
      console.log('❌ No se encontraron puntos de venta configurados\n');
      console.log('💡 Soluciones:\n');
      console.log('   1. Crea un punto de venta en AFIP:');
      console.log('      https://serviciosweb.afip.gob.ar/genericos/guiasPasoPaso/\n');
      console.log('   2. Usa el CUIT de prueba de AFIP (20409378472):\n');
      console.log('      - Edita .env: AFIP_CUIT=20409378472');
      console.log('      - Ejecuta: node scripts/generar-certificado-afip.js\n');
      return;
    }
    
    console.log(`✅ ${puntosVenta.length} punto(s) de venta encontrado(s):\n`);
    console.log('┌──────┬──────────────┬────────────────────────────────────┐');
    console.log('│  Nº  │   Estado     │  Descripción                       │');
    console.log('├──────┼──────────────┼────────────────────────────────────┤');
    
    puntosVenta.forEach(pv => {
      const numero = String(pv.Nro).padStart(4, '0');
      const estado = pv.Bloqueado === 'S' ? '🔒 Bloqueado' : '✅ Activo   ';
      const descripcion = pv.Descripcion || 'Sin descripción';
      
      console.log(`│ ${numero} │ ${estado} │ ${descripcion.padEnd(34).substring(0, 34)} │`);
    });
    
    console.log('└──────┴──────────────┴────────────────────────────────────┘\n');
    
    const puntosActivos = puntosVenta.filter(pv => pv.Bloqueado !== 'S');
    
    if (puntosActivos.length > 0) {
      console.log('💡 Para usar uno de estos puntos de venta:\n');
      console.log(`   Edita tu archivo .env:`);
      console.log(`   AFIP_PUNTO_VENTA=${puntosActivos[0].Nro}\n`);
      console.log(`   Luego ejecuta: npm run afip:test-conexion\n`);
    } else {
      console.log('⚠️  Todos los puntos de venta están bloqueados.\n');
      console.log('   Necesitas desbloquear uno en el portal de AFIP.\n');
    }
    
  } catch (error) {
    console.log('❌ Error al consultar puntos de venta:\n');
    console.log(`   ${error.message}\n`);
    
    if (error.message.includes('CUIT') || error.message.includes('1552')) {
      console.log('💡 Parece que tu CUIT no está habilitado para WSFE.\n');
      console.log('   Opciones:\n');
      console.log('   1. Habilita WSFE en AFIP (Administrador de Relaciones)');
      console.log('   2. Usa el CUIT de prueba: 20409378472\n');
    } else if (error.message.includes('certificado') || error.message.includes('certificate')) {
      console.log('💡 Problema con el certificado.\n');
      console.log('   Regenera el certificado:');
      console.log('   node scripts/generar-certificado-afip.js\n');
    }
  }
}

listarPuntosVenta().catch(error => {
  console.error('\n❌ ERROR FATAL:', error.message);
  console.error(error.stack);
  console.log();
});
