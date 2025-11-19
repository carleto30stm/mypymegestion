#!/usr/bin/env node

/**
 * Script para preparar certificados AFIP para Railway
 * Genera las variables de entorno con el contenido de los certificados
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n' + '='.repeat(70));
console.log('  PREPARAR CERTIFICADOS AFIP PARA RAILWAY');
console.log('='.repeat(70) + '\n');

console.log('🔐 Este script te ayudará a configurar certificados en Railway\n');
console.log('⚠️  IMPORTANTE - CONSIDERACIONES DE SEGURIDAD:\n');
console.log('   • Usa este método SOLO para ambiente de HOMOLOGACIÓN');
console.log('   • Para PRODUCCIÓN considera usar Railway Volumes o secretos externos');
console.log('   • NUNCA commitees certificados en Git');
console.log('   • Limita acceso al proyecto Railway solo a personas autorizadas\n');

const certPath = join(__dirname, '..', 'certs', 'cert.crt');
const keyPath = join(__dirname, '..', 'certs', 'private.key');

try {
  console.log('📂 Leyendo certificados...\n');
  
  const cert = readFileSync(certPath, 'utf8');
  const key = readFileSync(keyPath, 'utf8');
  
  console.log('✅ Certificados leídos correctamente\n');
  console.log('='.repeat(70));
  console.log('  VARIABLES DE ENTORNO PARA RAILWAY');
  console.log('='.repeat(70) + '\n');
  
  console.log('📋 Copia y pega estas variables en Railway:\n');
  console.log('   Dashboard → Project → Variables → Raw Editor\n');
  console.log('-'.repeat(70) + '\n');
  
  // Escapar saltos de línea correctamente
  const certEscaped = cert.trim().replace(/\n/g, '\\n');
  const keyEscaped = key.trim().replace(/\n/g, '\\n');
  
  console.log('# Certificado AFIP (Homologación)');
  console.log(`AFIP_CERT="${certEscaped}"`);
  console.log();
  console.log('# Clave privada AFIP (Homologación)');
  console.log(`AFIP_KEY="${keyEscaped}"`);
  console.log();
  
  console.log('-'.repeat(70) + '\n');
  
  console.log('📋 CONFIGURACIÓN ADICIONAL EN RAILWAY:\n');
  console.log('Agrega también estas variables si no las tienes:\n');
  console.log(`AFIP_CUIT=27118154520`);
  console.log(`AFIP_PRODUCTION=false`);
  console.log(`AFIP_PUNTO_VENTA=1`);
  console.log(`SDK_ACCESS_TOKEN=tu_token_aqui`);
  console.log();
  
  console.log('='.repeat(70));
  console.log('  MODIFICAR CÓDIGO BACKEND');
  console.log('='.repeat(70) + '\n');
  
  console.log('⚙️  Actualiza tu configuración de AFIP en el backend:\n');
  console.log('En vez de leer archivos, usa las variables de entorno directamente\n');
  
  console.log('Ejemplo actual (lee archivos):');
  console.log('```javascript');
  console.log('const afipConfig = {');
  console.log('  cert: "./certs/cert.crt",  // ❌ No funciona en Railway');
  console.log('  key: "./certs/private.key"  // ❌ No funciona en Railway');
  console.log('};');
  console.log('```\n');
  
  console.log('Cambiar a (usa variables):');
  console.log('```javascript');
  console.log('const afipConfig = {');
  console.log('  cert: process.env.AFIP_CERT,  // ✅ Funciona en Railway');
  console.log('  key: process.env.AFIP_KEY     // ✅ Funciona en Railway');
  console.log('};');
  console.log('```\n');
  
  console.log('='.repeat(70));
  console.log('  ALTERNATIVAS MÁS SEGURAS (PRODUCCIÓN)');
  console.log('='.repeat(70) + '\n');
  
  console.log('Para PRODUCCIÓN, considera estas opciones:\n');
  console.log('1. Railway Volumes (Persistente):');
  console.log('   • Crea un volumen en Railway');
  console.log('   • Sube certificados al volumen');
  console.log('   • Monta en /app/certs\n');
  
  console.log('2. HashiCorp Vault / AWS Secrets Manager:');
  console.log('   • Almacenamiento encriptado externo');
  console.log('   • Rotación automática de secretos');
  console.log('   • Auditoría completa\n');
  
  console.log('3. Certificados efímeros:');
  console.log('   • Genera certificados al iniciar el contenedor');
  console.log('   • Usa automatización del SDK');
  console.log('   • Se destruyen al reiniciar\n');
  
  console.log('💡 RECOMENDACIÓN FINAL:\n');
  console.log('   • Homologación: Variables de entorno (método actual) ✅');
  console.log('   • Producción: Railway Volumes + encriptación ✅\n');
  
} catch (error) {
  console.log('❌ Error al leer certificados:\n');
  console.log(`   ${error.message}\n`);
  console.log('💡 Asegúrate de haber generado los certificados primero:');
  console.log('   npm run afip:generar-cert\n');
}
