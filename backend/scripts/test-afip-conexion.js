#!/usr/bin/env node

/**
 * Script simple para verificar conexión con AFIP
 * 
 * Este script NO crea facturas, solo verifica:
 * - Conexión con servidor AFIP
 * - Autenticación (obtención de Token de Acceso)
 * - Consulta de últimos comprobantes
 * 
 * Uso: node scripts/test-afip-conexion.js
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Afip from '@afipsdk/afip.js';

dotenv.config();

// Configuración
const AFIP_CONFIG = {
  CUIT: process.env.AFIP_CUIT || '',
  access_token: process.env.SDK_ACCESS_TOKEN || '',
  cert: process.env.AFIP_CERT_PATH || './certs/cert.crt',
  key: process.env.AFIP_KEY_PATH || './certs/private.key',
  production: false,
  ta_folder: process.env.AFIP_TA_FOLDER || './afip_tokens'
};

const PUNTO_VENTA = parseInt(process.env.AFIP_PUNTO_VENTA || '1');

function mostrarBanner() {
  console.log('\n' + '='.repeat(70));
  console.log('  Test de Conexión AFIP - Facturación Electrónica');
  console.log('  Ambiente: HOMOLOGACIÓN');
  console.log('='.repeat(70) + '\n');
}

function verificarCertificados() {
  console.log('🔍 Verificando certificados...\n');
  
  const certPath = path.resolve(AFIP_CONFIG.cert);
  const keyPath = path.resolve(AFIP_CONFIG.key);
  
  console.log(`   Certificado: ${certPath}`);
  if (fs.existsSync(certPath)) {
    const stats = fs.statSync(certPath);
    console.log(`   ✅ Encontrado (${stats.size} bytes)`);
  } else {
    console.log(`   ❌ NO ENCONTRADO`);
    return false;
  }
  
  console.log(`\n   Clave privada: ${keyPath}`);
  if (fs.existsSync(keyPath)) {
    const stats = fs.statSync(keyPath);
    console.log(`   ✅ Encontrado (${stats.size} bytes)`);
  } else {
    console.log(`   ❌ NO ENCONTRADO`);
    return false;
  }
  
  console.log();
  return true;
}

function verificarConfiguracion() {
  console.log('🔧 Verificando configuración...\n');
  
  const checks = [
    { nombre: 'CUIT', valor: process.env.AFIP_CUIT, requerido: true },
    { nombre: 'SDK Access Token', valor: process.env.SDK_ACCESS_TOKEN ? '✓ Configurado' : 'NO CONFIGURADO', requerido: true },
    { nombre: 'Certificado', valor: process.env.AFIP_CERT_PATH, requerido: true },
    { nombre: 'Clave privada', valor: process.env.AFIP_KEY_PATH, requerido: true },
    { nombre: 'Punto de venta', valor: process.env.AFIP_PUNTO_VENTA, requerido: true },
    { nombre: 'Ambiente', valor: process.env.AFIP_PRODUCTION === 'true' ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN', requerido: false },
  ];
  
  let todoOk = true;
  
  for (const check of checks) {
    if (check.requerido && !check.valor) {
      console.log(`   ❌ ${check.nombre}: NO CONFIGURADO`);
      todoOk = false;
    } else if (check.nombre === 'SDK Access Token' && !process.env.SDK_ACCESS_TOKEN) {
      console.log(`   ❌ ${check.nombre}: ${check.valor}`);
      todoOk = false;
    } else {
      console.log(`   ✅ ${check.nombre}: ${check.valor}`);
    }
  }
  
  console.log();
  return todoOk;
}

async function testConexionServidor() {
  console.log('🌐 Probando conexión con servidor AFIP...\n');
  
  try {
    const afip = new Afip(AFIP_CONFIG);
    const estado = await afip.ElectronicBilling.getServerStatus();
    
    console.log('📊 Estado del servidor:');
    console.log(`   App Server: ${estado.AppServer}`);
    console.log(`   DB Server: ${estado.DbServer}`);
    console.log(`   Auth Server: ${estado.AuthServer}`);
    console.log();
    
    if (estado.AppServer === 'OK' && estado.DbServer === 'OK' && estado.AuthServer === 'OK') {
      console.log('✅ Conexión exitosa con servidor AFIP\n');
      return true;
    } else {
      console.log('⚠️  Servidor AFIP reporta problemas\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Error al conectar con AFIP:', error.message);
    console.error('   Detalles:', error);
    console.log();
    return false;
  }
}

async function testAutenticacion() {
  console.log('🔐 Probando autenticación...\n');
  
  try {
    const afip = new Afip(AFIP_CONFIG);
    
    // Intentar obtener el último comprobante (requiere autenticación)
    console.log('   Obteniendo Token de Acceso...');
    const ultimo = await afip.ElectronicBilling.getLastVoucher(PUNTO_VENTA, 6);
    
    console.log('   ✅ Autenticación exitosa');
    console.log(`   Último comprobante consultado: ${String(ultimo).padStart(8, '0')}`);
    console.log();
    
    return true;
  } catch (error) {
    console.error('❌ Error en autenticación:', error.message);
    
    if (error.message.includes('certificate')) {
      console.log('\n💡 Posibles causas:');
      console.log('   - Certificado no válido o expirado');
      console.log('   - Certificado no registrado en AFIP');
      console.log('   - Formato de certificado incorrecto');
    }
    
    if (error.message.includes('CUIT')) {
      console.log('\n💡 Posibles causas:');
      console.log('   - CUIT incorrecto');
      console.log('   - CUIT no autorizado para facturación electrónica');
    }
    
    console.log();
    return false;
  }
}

async function testConsultaComprobantes() {
  console.log('📋 Consultando últimos comprobantes autorizados...\n');
  
  try {
    const afip = new Afip(AFIP_CONFIG);
    
    const tipos = [
      { nombre: 'Factura A', codigo: 1 },
      { nombre: 'Factura B', codigo: 6 },
      { nombre: 'Factura C', codigo: 11 },
      { nombre: 'Nota Crédito A', codigo: 3 },
      { nombre: 'Nota Crédito B', codigo: 8 },
      { nombre: 'Nota Crédito C', codigo: 13 },
    ];
    
    console.log(`   Punto de venta: ${PUNTO_VENTA}\n`);
    
    for (const tipo of tipos) {
      try {
        const ultimo = await afip.ElectronicBilling.getLastVoucher(
          PUNTO_VENTA,
          tipo.codigo
        );
        const numeroFormateado = `${String(PUNTO_VENTA).padStart(4, '0')}-${String(ultimo).padStart(8, '0')}`;
        console.log(`   ${tipo.nombre.padEnd(20)} → ${numeroFormateado}`);
      } catch (error) {
        console.log(`   ${tipo.nombre.padEnd(20)} → Error: ${error.message}`);
      }
    }
    
    console.log();
    return true;
  } catch (error) {
    console.error('❌ Error al consultar comprobantes:', error.message);
    console.log();
    return false;
  }
}

async function testConsultaPuntosVenta() {
  console.log('🏪 Consultando puntos de venta disponibles...\n');
  
  try {
    const afip = new Afip(AFIP_CONFIG);
    const puntosVenta = await afip.ElectronicBilling.getSalesPoints();
    
    if (puntosVenta && puntosVenta.length > 0) {
      console.log(`   ✅ ${puntosVenta.length} punto(s) de venta encontrado(s):\n`);
      puntosVenta.forEach(pv => {
        const bloqueado = pv.Bloqueado === 'S' ? '🔒 BLOQUEADO' : '✅ Activo';
        console.log(`   • Nº ${pv.Nro.toString().padStart(4, '0')} - ${bloqueado}`);
        if (pv.FchBaja) {
          console.log(`     Fecha de baja: ${pv.FchBaja}`);
        }
      });
      console.log();
      return true;
    } else {
      console.log('   ⚠️  No se encontraron puntos de venta');
      console.log('   Puede que necesites crear uno en el portal de AFIP\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Error al consultar puntos de venta:', error.message);
    console.log();
    return false;
  }
}

function mostrarResumen(resultados) {
  console.log('='.repeat(70));
  console.log('  RESUMEN DE PRUEBAS');
  console.log('='.repeat(70) + '\n');
  
  const tests = [
    { nombre: 'Configuración', resultado: resultados.configuracion },
    { nombre: 'Certificados', resultado: resultados.certificados },
    { nombre: 'Conexión servidor', resultado: resultados.servidor },
    { nombre: 'Autenticación', resultado: resultados.autenticacion },
    { nombre: 'Consulta comprobantes', resultado: resultados.comprobantes },
    { nombre: 'Puntos de venta', resultado: resultados.puntosVenta },
  ];
  
  for (const test of tests) {
    const icono = test.resultado ? '✅' : '❌';
    const estado = test.resultado ? 'OK' : 'FALLÓ';
    console.log(`   ${icono} ${test.nombre.padEnd(25)} ${estado}`);
  }
  
  console.log();
  
  const todoOk = Object.values(resultados).every(r => r === true);
  
  if (todoOk) {
    console.log('🎉 ¡TODO FUNCIONÓ CORRECTAMENTE!');
    console.log('   Tu sistema está listo para facturar con AFIP');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Ejecuta: node scripts/test-afip-completo.js 7  (crear clientes)');
    console.log('   2. Ejecuta: node scripts/test-afip-completo.js 1  (factura de prueba)');
  } else {
    console.log('⚠️  ALGUNAS PRUEBAS FALLARON');
    console.log('\n💡 Revisa los errores anteriores y verifica:');
    console.log('   1. Variables en el archivo .env');
    console.log('   2. Certificados válidos y registrados en AFIP');
    console.log('   3. CUIT autorizado para facturación electrónica');
    console.log('   4. Punto de venta creado en el portal de AFIP');
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
}

async function main() {
  mostrarBanner();
  
  const resultados = {
    configuracion: false,
    certificados: false,
    servidor: false,
    autenticacion: false,
    comprobantes: false,
    puntosVenta: false,
  };
  
  try {
    // Test 1: Configuración
    resultados.configuracion = verificarConfiguracion();
    if (!resultados.configuracion) {
      console.log('❌ Configuración incompleta. Revisa tu archivo .env\n');
      mostrarResumen(resultados);
      return;
    }
    
    // Test 2: Certificados
    resultados.certificados = verificarCertificados();
    if (!resultados.certificados) {
      console.log('❌ Certificados no encontrados\n');
      console.log('💡 Debes generar certificados siguiendo la guía en FACTURACION_AFIP.md\n');
      mostrarResumen(resultados);
      return;
    }
    
    // Test 3: Conexión servidor
    resultados.servidor = await testConexionServidor();
    if (!resultados.servidor) {
      console.log('⚠️  No se pudo conectar con AFIP. Verifica tu conexión a internet.\n');
    }
    
    // Test 4: Autenticación
    resultados.autenticacion = await testAutenticacion();
    if (!resultados.autenticacion) {
      console.log('⚠️  Autenticación fallida. Revisa tus certificados y CUIT.\n');
    }
    
    // Test 5: Consulta comprobantes (solo si la autenticación funcionó)
    if (resultados.autenticacion) {
      resultados.comprobantes = await testConsultaComprobantes();
    }
    
    // Test 6: Puntos de venta (solo si la autenticación funcionó)
    if (resultados.autenticacion) {
      resultados.puntosVenta = await testConsultaPuntosVenta();
    }
    
    // Mostrar resumen
    mostrarResumen(resultados);
    
  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error.message);
    console.error(error.stack);
    console.log();
  }
}

main();
