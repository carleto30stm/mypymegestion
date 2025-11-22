#!/usr/bin/env node

/**
 * Script para configurar AFIP en ambiente local
 * 
 * Este script verifica y configura todo lo necesario para generar TAs localmente:
 * 1. Verifica OpenSSL
 * 2. Verifica estructura de carpetas
 * 3. Verifica certificados
 * 4. Genera TA de prueba
 * 
 * Uso: node scripts/setup-local-afip.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG = {
  certPath: process.env.AFIP_CERT_PATH || './certs/cert.crt',
  keyPath: process.env.AFIP_KEY_PATH || './certs/private.key',
  taFolder: process.env.AFIP_TA_FOLDER || './afip_tokens',
  cuit: process.env.AFIP_CUIT
};

console.log('\n' + '='.repeat(70));
console.log('  🔧 Configuración de AFIP para Ambiente Local');
console.log('='.repeat(70) + '\n');

let todoBien = true;
let pasos = [];

// ========== PASO 1: Verificar OpenSSL ==========
console.log('📦 PASO 1: Verificando OpenSSL...');
try {
  const version = execSync('openssl version', { encoding: 'utf8' }).trim();
  console.log(`   ✅ OpenSSL instalado: ${version}\n`);
} catch (error) {
  console.log('   ❌ OpenSSL NO instalado\n');
  todoBien = false;
  pasos.push({
    titulo: 'Instalar OpenSSL',
    comandos: [
      'Como Administrador en PowerShell:',
      '  choco install openssl -y',
      '',
      'O descargar desde:',
      '  https://slproweb.com/products/Win32OpenSSL.html',
      '',
      'Después reinicia VSCode/PowerShell'
    ]
  });
}

// ========== PASO 2: Verificar carpetas ==========
console.log('📁 PASO 2: Verificando estructura de carpetas...');
const carpetas = [
  { ruta: './certs', nombre: 'Certificados' },
  { ruta: CONFIG.taFolder, nombre: 'Tokens AFIP' }
];

for (const carpeta of carpetas) {
  const rutaCompleta = path.resolve(carpeta.ruta);
  if (fs.existsSync(rutaCompleta)) {
    console.log(`   ✅ ${carpeta.nombre}: ${rutaCompleta}`);
  } else {
    console.log(`   ⚠️  ${carpeta.nombre} no existe, creando...`);
    try {
      fs.mkdirSync(rutaCompleta, { recursive: true });
      console.log(`   ✅ Creada: ${rutaCompleta}`);
    } catch (error) {
      console.log(`   ❌ Error al crear: ${error.message}`);
      todoBien = false;
    }
  }
}
console.log();

// ========== PASO 3: Verificar certificados ==========
console.log('🔐 PASO 3: Verificando certificados AFIP...');
const certCompleto = path.resolve(CONFIG.certPath);
const keyCompleto = path.resolve(CONFIG.keyPath);

let faltaCert = false;
let faltaKey = false;

if (fs.existsSync(certCompleto)) {
  const certContent = fs.readFileSync(certCompleto, 'utf8');
  const certSize = certContent.length;
  const esPEM = certContent.includes('BEGIN CERTIFICATE');
  console.log(`   ✅ Certificado encontrado: ${certCompleto}`);
  console.log(`      Tamaño: ${certSize} bytes`);
  console.log(`      Formato: ${esPEM ? 'PEM ✓' : 'Desconocido ⚠️'}`);
} else {
  console.log(`   ❌ Certificado NO encontrado: ${certCompleto}`);
  faltaCert = true;
  todoBien = false;
}

if (fs.existsSync(keyCompleto)) {
  const keyContent = fs.readFileSync(keyCompleto, 'utf8');
  const keySize = keyContent.length;
  const esPEM = keyContent.includes('BEGIN PRIVATE KEY') || keyContent.includes('BEGIN RSA PRIVATE KEY');
  console.log(`   ✅ Clave privada encontrada: ${keyCompleto}`);
  console.log(`      Tamaño: ${keySize} bytes`);
  console.log(`      Formato: ${esPEM ? 'PEM ✓' : 'Desconocido ⚠️'}`);
} else {
  console.log(`   ❌ Clave privada NO encontrada: ${keyCompleto}`);
  faltaKey = true;
  todoBien = false;
}

if (faltaCert || faltaKey) {
  pasos.push({
    titulo: 'Copiar certificados desde Railway',
    comandos: [
      '=== OPCIÓN A: Usando Railway CLI ===',
      'npm install -g @railway/cli',
      'railway login',
      'railway link',
      'railway run "cat certs/cert.crt" > backend/certs/cert.crt',
      'railway run "cat certs/private.key" > backend/certs/private.key',
      '',
      '=== OPCIÓN B: Copiar manualmente ===',
      '1. Ir a Railway Dashboard → Backend → Shell',
      '2. Ejecutar: cat certs/cert.crt',
      '3. Copiar contenido completo (desde -----BEGIN hasta -----END)',
      '4. Crear archivo backend/certs/cert.crt y pegar',
      '5. Repetir con: cat certs/private.key',
      '6. Crear archivo backend/certs/private.key y pegar',
      '',
      '⚠️  IMPORTANTE: Los certificados son secretos, no commitear a git'
    ]
  });
}
console.log();

// ========== PASO 4: Verificar .env ==========
console.log('⚙️  PASO 4: Verificando configuración .env...');
const configItems = [
  { key: 'AFIP_CUIT', value: CONFIG.cuit, required: true },
  { key: 'AFIP_CERT_PATH', value: CONFIG.certPath, required: true },
  { key: 'AFIP_KEY_PATH', value: CONFIG.keyPath, required: true },
  { key: 'AFIP_TA_FOLDER', value: CONFIG.taFolder, required: true },
  { key: 'AFIP_PRODUCTION', value: process.env.AFIP_PRODUCTION, required: true },
  { key: 'AFIP_PUNTO_VENTA', value: process.env.AFIP_PUNTO_VENTA, required: true }
];

for (const item of configItems) {
  if (item.value) {
    console.log(`   ✅ ${item.key}: ${item.value}`);
  } else {
    console.log(`   ${item.required ? '❌' : '⚠️ '} ${item.key}: NO configurado`);
    if (item.required) todoBien = false;
  }
}
console.log();

// ========== PASO 5: Verificar TA existente ==========
console.log('🎫 PASO 5: Verificando Ticket de Acceso (TA)...');
const taFile = path.join(CONFIG.taFolder, 'TA-wsfe.json');

if (fs.existsSync(taFile)) {
  try {
    const taData = JSON.parse(fs.readFileSync(taFile, 'utf8'));
    const expiration = new Date(taData.expirationTime);
    const now = new Date();
    const horasRestantes = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (horasRestantes > 0) {
      console.log(`   ✅ TA válido encontrado: ${taFile}`);
      console.log(`      Expira: ${expiration.toLocaleString('es-AR')}`);
      console.log(`      Tiempo restante: ${horasRestantes.toFixed(1)} horas`);
    } else {
      console.log(`   ⚠️  TA encontrado pero EXPIRADO`);
      console.log(`      Expiró: ${expiration.toLocaleString('es-AR')}`);
      pasos.push({
        titulo: 'Regenerar TA expirado',
        comandos: [
          'node scripts/obtener-ta-afip.js --force'
        ]
      });
    }
  } catch (error) {
    console.log(`   ⚠️  Error al leer TA: ${error.message}`);
  }
} else {
  console.log(`   ℹ️  No hay TA generado todavía`);
  if (todoBien) {
    pasos.push({
      titulo: 'Generar TA',
      comandos: [
        'node scripts/obtener-ta-afip.js'
      ]
    });
  }
}
console.log();

// ========== RESUMEN ==========
console.log('='.repeat(70));

if (todoBien && pasos.length === 0) {
  console.log('  ✅ TODO CONFIGURADO CORRECTAMENTE');
  console.log('='.repeat(70) + '\n');
  console.log('🎉 Tu ambiente local está listo para usar AFIP!\n');
  console.log('📝 Próximos pasos:');
  console.log('   1. Iniciar el backend: npm run dev');
  console.log('   2. Las facturas se autorizarán automáticamente con AFIP');
  console.log('   3. El TA se regenerará automáticamente cuando expire\n');
} else {
  console.log('  ⚠️  CONFIGURACIÓN INCOMPLETA');
  console.log('='.repeat(70) + '\n');
  
  if (pasos.length > 0) {
    console.log('📋 Pasos pendientes:\n');
    pasos.forEach((paso, index) => {
      console.log(`${index + 1}. ${paso.titulo}`);
      console.log('─'.repeat(70));
      paso.comandos.forEach(cmd => {
        console.log(`   ${cmd}`);
      });
      console.log();
    });
  }
  
  console.log('💡 Consulta la guía completa en: backend/GENERAR_TA_LOCAL.md\n');
}

console.log('='.repeat(70) + '\n');

process.exit(todoBien && pasos.length === 0 ? 0 : 1);
