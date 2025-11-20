#!/usr/bin/env node

/**
 * Script de diagnóstico detallado de autenticación AFIP
 * Muestra información completa sobre errores
 */

import dotenv from 'dotenv';
import Afip from '@afipsdk/afip.js';
import fs from 'fs';
import path from 'path';

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
console.log('  DIAGNÓSTICO DETALLADO DE AUTENTICACIÓN AFIP');
console.log('='.repeat(70) + '\n');

console.log('📋 Configuración:');
console.log(`   CUIT: ${AFIP_CONFIG.CUIT}`);
console.log(`   Ambiente: HOMOLOGACIÓN`);
console.log(`   Certificado: ${AFIP_CONFIG.cert}`);
console.log(`   Clave privada: ${AFIP_CONFIG.key}`);
console.log(`   SDK Token: ${AFIP_CONFIG.access_token ? '✓ Configurado' : '✗ NO configurado'}`);
console.log();

// Verificar certificado
console.log('🔍 Verificando certificado...\n');
const certPath = path.resolve(AFIP_CONFIG.cert);
const keyPath = path.resolve(AFIP_CONFIG.key);

if (fs.existsSync(certPath)) {
  const stats = fs.statSync(certPath);
  console.log(`   ✅ Certificado encontrado (${stats.size} bytes)`);
} else {
  console.log(`   ❌ Certificado NO encontrado`);
}

if (fs.existsSync(keyPath)) {
  const stats = fs.statSync(keyPath);
  console.log(`   ✅ Clave privada encontrada (${stats.size} bytes)`);
} else {
  console.log(`   ❌ Clave privada NO encontrada`);
}

console.log();

async function testAuth() {
  try {
    console.log('🔐 Intentando autenticación...\n');
    
    const afip = new Afip(AFIP_CONFIG);
    
    console.log('   Paso 1: Creando instancia del SDK... ✅');
    console.log('   Paso 2: Solicitando Token de Acceso (TA)...');
    
    // Intentar obtener el estado del servidor primero
    try {
      const estado = await afip.ElectronicBilling.getServerStatus();
      console.log('   Paso 3: Servidor AFIP respondió ✅');
      console.log(`      - App Server: ${estado.AppServer}`);
      console.log(`      - DB Server: ${estado.DbServer}`);
      console.log(`      - Auth Server: ${estado.AuthServer}`);
    } catch (error) {
      console.log('   Paso 3: Error al consultar servidor ❌');
      throw error;
    }
    
    console.log('\n   Paso 4: Consultando puntos de venta...');
    
    try {
      const puntosVenta = await afip.ElectronicBilling.getSalesPoints();
      console.log('   Paso 5: Puntos de venta obtenidos ✅\n');
      
      if (puntosVenta && puntosVenta.length > 0) {
        console.log(`✅ ${puntosVenta.length} punto(s) de venta encontrado(s):\n`);
        puntosVenta.forEach(pv => {
          const estado = pv.Bloqueado === 'S' ? '🔒 BLOQUEADO' : '✅ Activo';
          console.log(`   • Nº ${String(pv.Nro).padStart(4, '0')} - ${estado}`);
        });
      } else {
        console.log('⚠️  No hay puntos de venta configurados');
      }
      
      console.log('\n' + '='.repeat(70));
      console.log('  ✅ AUTENTICACIÓN EXITOSA');
      console.log('='.repeat(70) + '\n');
      
    } catch (error) {
      console.log('   Paso 5: Error al consultar puntos de venta ❌\n');
      throw error;
    }
    
  } catch (error) {
    console.log('\n' + '='.repeat(70));
    console.log('  ❌ ERROR EN AUTENTICACIÓN');
    console.log('='.repeat(70) + '\n');
    
    console.log('📋 Información del error:\n');
    console.log(`   Mensaje: ${error.message}`);
    
    if (error.response) {
      console.log(`\n   Código HTTP: ${error.response.status}`);
      console.log(`   Estado: ${error.response.statusText}`);
      
      if (error.response.data) {
        console.log('\n   Datos de respuesta:');
        console.log(JSON.stringify(error.response.data, null, 2));
      }
    }
    
    if (error.stack) {
      console.log('\n   Stack trace:');
      console.log(error.stack);
    }
    
    console.log('\n💡 POSIBLES CAUSAS:\n');
    
    if (error.message.includes('400')) {
      console.log('   Error 400 - Bad Request:');
      console.log('   • La autorización WSFE puede no estar activa aún (espera 5-10 min)');
      console.log('   • El alias del certificado no coincide con la autorización');
      console.log('   • El certificado no está correctamente registrado');
      console.log('   • Falta crear puntos de venta en AFIP');
    } else if (error.message.includes('certificate')) {
      console.log('   Problema con certificados:');
      console.log('   • Certificado expirado o inválido');
      console.log('   • Certificado no registrado en AFIP');
    } else if (error.message.includes('CUIT')) {
      console.log('   Problema con CUIT:');
      console.log('   • CUIT no autorizado para WSFE');
      console.log('   • CUIT incorrecto');
    }
    
    console.log('\n✅ SOLUCIONES:\n');
    console.log('   1. Espera 5-10 minutos para que la autorización se propague');
    console.log('   2. Verifica en el portal de AFIP que la autorización esté activa');
    console.log('   3. Asegúrate que el alias sea "kurt" en la autorización');
    console.log('   4. Crea un punto de venta en AFIP si no existe\n');
    
    console.log('='.repeat(70) + '\n');
  }
}

testAuth();
