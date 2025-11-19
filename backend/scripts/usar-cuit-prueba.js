#!/usr/bin/env node

/**
 * Script para cambiar rápidamente al CUIT de prueba de AFIP
 * Útil cuando los servidores están caídos o para testing
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CUIT_PRUEBA = '20409378472';

console.log('\n' + '='.repeat(70));
console.log('  CAMBIAR A CUIT DE PRUEBA OFICIAL DE AFIP');
console.log('='.repeat(70) + '\n');

console.log('🎯 Este script configurará el CUIT de prueba oficial de AFIP\n');
console.log(`   CUIT de prueba: ${CUIT_PRUEBA}\n`);
console.log('✅ Ventajas:\n');
console.log('   • Servicio WSFE ya autorizado');
console.log('   • Puntos de venta pre-configurados');
console.log('   • Funciona incluso cuando homologación está inestable');
console.log('   • Ideal para desarrollo y testing\n');
console.log('⚠️  Limitaciones:\n');
console.log('   • Es un CUIT compartido (datos de prueba)');
console.log('   • No es tu CUIT real');
console.log('   • Solo para ambiente de homologación\n');

const envPath = join(__dirname, '..', '.env');

try {
  let envContent = readFileSync(envPath, 'utf8');
  
  console.log('📝 Actualizando archivo .env...\n');
  
  // Buscar AFIP_CUIT actual
  const cuitMatch = envContent.match(/AFIP_CUIT=(\d+)/);
  const cuitActual = cuitMatch ? cuitMatch[1] : 'no configurado';
  
  console.log(`   CUIT actual: ${cuitActual}`);
  console.log(`   CUIT nuevo:  ${CUIT_PRUEBA}\n`);
  
  // Reemplazar AFIP_CUIT
  if (envContent.includes('AFIP_CUIT=')) {
    envContent = envContent.replace(/AFIP_CUIT=\d+/, `AFIP_CUIT=${CUIT_PRUEBA}`);
  } else {
    envContent += `\nAFIP_CUIT=${CUIT_PRUEBA}\n`;
  }
  
  // Escribir archivo
  writeFileSync(envPath, envContent, 'utf8');
  
  console.log('✅ Archivo .env actualizado\n');
  console.log('='.repeat(70));
  console.log('  PRÓXIMOS PASOS');
  console.log('='.repeat(70) + '\n');
  console.log('1. Regenerar certificado con el nuevo CUIT:');
  console.log('   npm run afip:generar-cert\n');
  console.log('2. Verificar que AFIP esté disponible:');
  console.log('   npm run afip:verificar-endpoints\n');
  console.log('3. Listar puntos de venta disponibles:');
  console.log('   npm run afip:listar-puntos\n');
  console.log('4. Ejecutar pruebas completas:');
  console.log('   npm run afip:diagnostico\n');
  console.log('💡 Para volver a tu CUIT original:');
  console.log(`   Edita .env: AFIP_CUIT=${cuitActual}`);
  console.log('   Regenera certificado: npm run afip:generar-cert\n');
  
} catch (error) {
  console.log('❌ Error al actualizar .env:\n');
  console.log(`   ${error.message}\n`);
  console.log('💡 Actualiza manualmente el archivo .env:');
  console.log(`   AFIP_CUIT=${CUIT_PRUEBA}\n`);
}
