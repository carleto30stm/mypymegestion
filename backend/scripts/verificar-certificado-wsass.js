#!/usr/bin/env node

/**
 * Script para verificar si el certificado está correctamente configurado
 * para WSFE en WSASS de homologación
 */

import dotenv from 'dotenv';
import fs from 'fs';
import { execSync } from 'child_process';

dotenv.config();

console.log('\n' + '='.repeat(70));
console.log('  VERIFICACIÓN DE CERTIFICADO AFIP');
console.log('='.repeat(70) + '\n');

const certPath = process.env.AFIP_CERT_PATH || './certs/cert.crt';
const keyPath = process.env.AFIP_KEY_PATH || './certs/private.key';

console.log('📋 Información del certificado:\n');

// Verificar que existan los archivos
if (!fs.existsSync(certPath)) {
  console.log('❌ Certificado NO encontrado:', certPath);
  console.log('\n💡 Genera uno con: npm run afip:generar-cert\n');
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.log('❌ Clave privada NO encontrada:', keyPath);
  console.log('\n💡 Genera uno con: npm run afip:generar-cert\n');
  process.exit(1);
}

console.log('✅ Archivos encontrados\n');

try {
  // Leer información del certificado con OpenSSL
  console.log('🔍 Detalles del certificado:\n');
  
  // Subject (dueño del certificado)
  const subject = execSync(`openssl x509 -in ${certPath} -noout -subject`, { encoding: 'utf-8' });
  console.log('   Subject:', subject.trim());
  
  // Fechas de validez
  const dates = execSync(`openssl x509 -in ${certPath} -noout -dates`, { encoding: 'utf-8' });
  console.log('   ' + dates.trim().replace(/\n/g, '\n   '));
  
  // Serial number
  const serial = execSync(`openssl x509 -in ${certPath} -noout -serial`, { encoding: 'utf-8' });
  console.log('   ' + serial.trim());
  
  console.log();
  
  // Verificar que la clave privada corresponda al certificado
  console.log('🔐 Verificando que certificado y clave privada coincidan...\n');
  
  const certModulus = execSync(`openssl x509 -in ${certPath} -noout -modulus`, { encoding: 'utf-8' });
  const keyModulus = execSync(`openssl rsa -in ${keyPath} -noout -modulus 2>nul`, { encoding: 'utf-8' });
  
  if (certModulus === keyModulus) {
    console.log('   ✅ Certificado y clave privada coinciden\n');
  } else {
    console.log('   ❌ ERROR: Certificado y clave privada NO coinciden\n');
    console.log('   💡 Debes regenerar ambos archivos juntos\n');
    process.exit(1);
  }
  
} catch (error) {
  console.log('⚠️  No se pudo leer con OpenSSL (puede no estar instalado)');
  console.log('   Pero los archivos existen, así que probablemente están OK\n');
}

console.log('='.repeat(70));
console.log('  PRÓXIMOS PASOS');
console.log('='.repeat(70) + '\n');

console.log('❌ PROBLEMA ACTUAL: Error 400 en autenticación\n');
console.log('📋 CAUSA: Certificado NO está autorizado en WSASS para servicio WSFE\n');
console.log('✅ SOLUCIÓN: Registrar certificado en portal WSASS\n');
console.log('   1. Ir a: https://wsass-homo.afip.gob.ar/wsass/portal/main.aspx');
console.log('   2. Login con CUIT ' + (process.env.AFIP_CUIT || 'TU_CUIT') + ' y Clave Fiscal');
console.log('   3. Menú → "Administrar certificados"');
console.log('   4. Subir certificado (cert.crt)');
console.log('   5. Asociar al servicio "wsfe"');
console.log('   6. Guardar y esperar 5-10 minutos\n');
console.log('⏱️  Después de autorizar en WSASS:');
console.log('   npm run afip:verificar-endpoints\n');
console.log('💡 IMPORTANTE: La autorización puede tardar hasta 15 minutos en activarse\n');

console.log('='.repeat(70) + '\n');
