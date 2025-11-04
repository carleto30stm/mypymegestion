#!/usr/bin/env node

/**
 * Script para generar certificados AFIP manualmente
 * usando OpenSSL (método gratuito)
 * 
 * Este script genera:
 * - Clave privada (private.key)
 * - Solicitud de certificado (request.csr)
 * 
 * Luego debes subir el CSR a AFIP manualmente.
 * 
 * Uso: node scripts/generar-certificado-manual.js
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(texto) {
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      resolve(respuesta);
    });
  });
}

function mostrarBanner() {
  console.log('\n' + '='.repeat(70));
  console.log('  Generador Manual de Certificados AFIP');
  console.log('  (Método OpenSSL - Gratuito)');
  console.log('='.repeat(70) + '\n');
}

function verificarOpenSSL() {
  console.log('🔍 Verificando OpenSSL...\n');
  
  try {
    const version = execSync('openssl version', { encoding: 'utf8' });
    console.log(`   ✅ OpenSSL encontrado: ${version.trim()}\n`);
    return true;
  } catch (error) {
    console.log('   ❌ OpenSSL no encontrado\n');
    console.log('💡 Debes instalar OpenSSL:');
    console.log('   • Windows: https://slproweb.com/products/Win32OpenSSL.html');
    console.log('   • O usa Git Bash que incluye OpenSSL');
    console.log('   • O usa WSL (Windows Subsystem for Linux)\n');
    return false;
  }
}

async function obtenerDatos() {
  const cuitEnv = process.env.AFIP_CUIT || '';
  
  console.log('📝 Ingresa los siguientes datos:\n');
  
  // CUIT
  let cuit = await pregunta(`   CUIT [${cuitEnv}]: `);
  if (!cuit.trim()) {
    cuit = cuitEnv;
  }
  
  if (!cuit || cuit.length !== 11) {
    throw new Error('CUIT inválido. Debe tener 11 dígitos sin guiones.');
  }
  
  // Razón Social
  const razonSocial = await pregunta('   Razón Social [Mi Empresa]: ');
  const empresa = razonSocial.trim() || 'Mi Empresa';
  
  return { cuit, empresa };
}

function generarCertificados(datos) {
  console.log('\n🔄 Generando certificados...\n');
  
  const certsDir = path.resolve(process.cwd(), 'certs');
  
  // Crear carpeta certs si no existe
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
    console.log('   📁 Carpeta certs/ creada');
  }
  
  const keyPath = path.join(certsDir, 'private.key');
  const csrPath = path.join(certsDir, 'request.csr');
  
  try {
    // 1. Generar clave privada
    console.log('   🔑 Generando clave privada (2048 bits)...');
    execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'pipe' });
    console.log(`   ✅ Clave privada guardada: ${keyPath}`);
    
    // 2. Generar CSR (Certificate Signing Request)
    console.log('\n   📝 Generando solicitud de certificado (CSR)...');
    const subject = `/C=AR/O=${datos.empresa}/CN=${datos.empresa}/serialNumber=CUIT ${datos.cuit}`;
    execSync(`openssl req -new -key "${keyPath}" -out "${csrPath}" -subj "${subject}"`, { stdio: 'pipe' });
    console.log(`   ✅ CSR guardado: ${csrPath}`);
    
    return { keyPath, csrPath };
    
  } catch (error) {
    throw new Error(`Error al ejecutar OpenSSL: ${error.message}`);
  }
}

function mostrarInstrucciones(datos, archivos) {
  console.log('\n' + '='.repeat(70));
  console.log('  ✅ ARCHIVOS GENERADOS EXITOSAMENTE');
  console.log('='.repeat(70) + '\n');
  
  console.log('📂 Archivos creados:\n');
  console.log(`   ${archivos.keyPath}`);
  console.log(`   ${archivos.csrPath}\n`);
  
  console.log('📋 Próximos pasos (MANUAL):\n');
  console.log('1️⃣  Ir al portal de AFIP:\n');
  console.log('   🌐 https://auth.afip.gob.ar/contribuyente_/\n');
  
  console.log('2️⃣  Navegar a:\n');
  console.log('   Administrador de Relaciones de Clave Fiscal');
  console.log('   → Nueva Relación');
  console.log('   → Buscar: "Factura Electrónica" o "Servicios Web"');
  console.log('   → Seleccionar el servicio correspondiente\n');
  
  console.log('3️⃣  Generar Certificado Digital:\n');
  console.log('   → Clic en "Generar Certificado"');
  console.log('   → Seleccionar "Homologación" (para testing)');
  console.log('   → Subir el archivo CSR:');
  console.log(`      ${archivos.csrPath}\n`);
  
  console.log('4️⃣  Descargar el certificado:\n');
  console.log('   → AFIP procesará tu CSR');
  console.log('   → Descarga el certificado (.crt)');
  console.log('   → Guárdalo como: certs/cert.crt\n');
  
  console.log('5️⃣  Verificar tu configuración (.env):\n');
  console.log('   AFIP_CUIT=' + datos.cuit);
  console.log('   AFIP_PRODUCTION=false');
  console.log('   AFIP_CERT_PATH=./certs/cert.crt');
  console.log('   AFIP_KEY_PATH=./certs/private.key\n');
  
  console.log('6️⃣  Probar la conexión:\n');
  console.log('   npm run afip:test-conexion\n');
  
  console.log('='.repeat(70) + '\n');
  
  console.log('💡 TIPS:\n');
  console.log('   • El CSR es un archivo de texto, ábrelo para verificar');
  console.log('   • Guarda bien tu private.key, es secreto');
  console.log('   • Para producción repite el proceso pero selecciona "Producción"\n');
}

async function main() {
  try {
    mostrarBanner();
    
    const tieneOpenSSL = verificarOpenSSL();
    
    if (!tieneOpenSSL) {
      console.log('❌ No se puede continuar sin OpenSSL\n');
      rl.close();
      return;
    }
    
    const datos = await obtenerDatos();
    
    console.log('\n⚠️  Estás a punto de generar certificados con estos datos:');
    console.log(`   CUIT: ${datos.cuit}`);
    console.log(`   Empresa: ${datos.empresa}`);
    
    const confirmar = await pregunta('\n   ¿Continuar? (s/n): ');
    
    if (confirmar.toLowerCase() !== 's' && confirmar.toLowerCase() !== 'si') {
      console.log('\n❌ Operación cancelada\n');
      rl.close();
      return;
    }
    
    const archivos = generarCertificados(datos);
    mostrarInstrucciones(datos, archivos);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log();
  } finally {
    rl.close();
  }
}

main();
