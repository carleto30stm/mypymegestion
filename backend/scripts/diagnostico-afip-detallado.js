#!/usr/bin/env node

/**
 * Script de diagnóstico detallado AFIP
 * Muestra el error EXACTO y propone soluciones
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

const PUNTO_VENTA = parseInt(process.env.AFIP_PUNTO_VENTA || '1');

console.log('\n' + '='.repeat(70));
console.log('  DIAGNÓSTICO DETALLADO AFIP');
console.log('='.repeat(70) + '\n');

console.log('📋 Configuración actual:\n');
console.log(`   CUIT: ${AFIP_CONFIG.CUIT}`);
console.log(`   Punto de venta: ${PUNTO_VENTA}`);
console.log(`   Ambiente: HOMOLOGACIÓN`);
console.log(`   SDK Token: ${AFIP_CONFIG.access_token ? '✓ Configurado' : '✗ NO configurado'}`);
console.log(`   Certificado: ${AFIP_CONFIG.cert}`);
console.log(`   Clave: ${AFIP_CONFIG.key}\n`);

async function diagnosticar() {
  const afip = new Afip(AFIP_CONFIG);
  
  console.log('🔍 PRUEBA 1: Verificar estado del servidor AFIP\n');
  try {
    const estado = await afip.ElectronicBilling.getServerStatus();
    console.log('   ✅ Servidor AFIP accesible');
    console.log(`      App: ${estado.AppServer}, DB: ${estado.DbServer}, Auth: ${estado.AuthServer}\n`);
  } catch (error) {
    console.log('   ❌ Error al conectar con servidor AFIP');
    console.log(`      ${error.message}\n`);
    return;
  }
  
  console.log('🔍 PRUEBA 2: Autenticación y obtención de Token de Acceso\n');
  try {
    // Forzar obtención de TA
    console.log('   Intentando obtener Token de Acceso (TA)...');
    const ultimo = await afip.ElectronicBilling.getLastVoucher(PUNTO_VENTA, 6);
    console.log('   ✅ Autenticación exitosa');
    console.log(`   ✅ Token de Acceso obtenido correctamente`);
    console.log(`   Último comprobante Factura B: ${String(ultimo).padStart(8, '0')}\n`);
  } catch (error) {
    console.log('   ❌ ERROR EN AUTENTICACIÓN\n');
    console.log('   📋 Mensaje de error completo:\n');
    console.log(`      ${error.message}\n`);
    
    if (error.stack) {
      console.log('   📋 Stack trace (primeras líneas):');
      const stackLines = error.stack.split('\n').slice(0, 5);
      stackLines.forEach(line => console.log(`      ${line}`));
      console.log();
    }
    
    console.log('   💡 ANÁLISIS DEL ERROR:\n');
    
    // Analizar tipo de error
    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes('punto de venta') || errorMsg.includes('point of sale') || errorMsg.includes('1553')) {
      console.log('   ⚠️  ERROR DETECTADO: Punto de venta no existe\n');
      console.log('   📌 CAUSA:');
      console.log('      El punto de venta configurado (Nº ' + PUNTO_VENTA + ') no está creado');
      console.log('      en AFIP para tu CUIT en el ambiente de HOMOLOGACIÓN.\n');
      console.log('   ✅ SOLUCIÓN:');
      console.log('      Opción 1 - Usar punto de venta que SÍ existe:');
      console.log('         Ejecuta: node scripts/listar-puntos-venta.js');
      console.log('         (Te mostrará qué puntos de venta tienes disponibles)\n');
      console.log('      Opción 2 - Crear punto de venta en AFIP:');
      console.log('         1. Entra a: https://serviciosweb.afip.gob.ar/genericos/guiasPasoPaso/');
      console.log('         2. Busca "Comprobantes en línea - Alta de punto de venta"');
      console.log('         3. Crea un punto de venta para ambiente HOMOLOGACIÓN');
      console.log('         4. Actualiza AFIP_PUNTO_VENTA en tu .env\n');
      console.log('      Opción 3 - Usar CUIT de prueba de AFIP:');
      console.log('         Cambia AFIP_CUIT=20409378472 en .env');
      console.log('         Regenera certificado: node scripts/generar-certificado-afip.js\n');
      
    } else if (errorMsg.includes('certificado') || errorMsg.includes('certificate') || errorMsg.includes('cert')) {
      console.log('   ⚠️  ERROR DETECTADO: Problema con certificado\n');
      console.log('   📌 CAUSAS POSIBLES:');
      console.log('      • Certificado no autorizado para WSFE en AFIP');
      console.log('      • Certificado vencido o inválido');
      console.log('      • Certificado no coincide con el CUIT\n');
      console.log('   ✅ SOLUCIÓN:');
      console.log('      1. Verifica que el certificado esté autorizado para WSFE');
      console.log('      2. Regenera certificado: node scripts/generar-certificado-afip.js\n');
      
    } else if (errorMsg.includes('cuit') || errorMsg.includes('1552')) {
      console.log('   ⚠️  ERROR DETECTADO: CUIT no autorizado\n');
      console.log('   📌 CAUSA:');
      console.log('      Tu CUIT no está habilitado para facturación electrónica');
      console.log('      en el ambiente de HOMOLOGACIÓN de AFIP.\n');
      console.log('   ✅ SOLUCIÓN:');
      console.log('      Opción 1 - Habilitar tu CUIT en AFIP:');
      console.log('         1. Entra a AFIP con Clave Fiscal');
      console.log('         2. Administrador de Relaciones → Nueva Relación');
      console.log('         3. Busca "Facturación Electrónica" o "WSFE"');
      console.log('         4. Autoriza el servicio\n');
      console.log('      Opción 2 - Usar CUIT de prueba oficial:');
      console.log('         AFIP_CUIT=20409378472 (CUIT de testing)\n');
      
    } else if (errorMsg.includes('token') || errorMsg.includes('access') || errorMsg.includes('401')) {
      console.log('   ⚠️  ERROR DETECTADO: Token de acceso inválido\n');
      console.log('   📌 CAUSA:');
      console.log('      El SDK_ACCESS_TOKEN puede estar vencido o ser inválido.\n');
      console.log('   ✅ SOLUCIÓN:');
      console.log('      1. Ve a: https://developers.afipsdk.com/');
      console.log('      2. Inicia sesión o crea una cuenta');
      console.log('      3. Genera un nuevo Access Token');
      console.log('      4. Actualiza SDK_ACCESS_TOKEN en .env\n');
      
    } else {
      console.log('   ⚠️  ERROR DESCONOCIDO\n');
      console.log('   📌 El mensaje de error no coincide con problemas conocidos.\n');
      console.log('   💡 SUGERENCIAS:');
      console.log('      1. Copia el mensaje de error completo de arriba');
      console.log('      2. Búscalo en: https://www.afip.gob.ar/ws/documentacion/');
      console.log('      3. O consulta con soporte de AFIP\n');
    }
    
    return;
  }
  
  console.log('🔍 PRUEBA 3: Consultar puntos de venta disponibles\n');
  try {
    const puntosVenta = await afip.ElectronicBilling.getSalesPoints();
    
    if (puntosVenta && puntosVenta.length > 0) {
      console.log(`   ✅ ${puntosVenta.length} punto(s) de venta encontrado(s):\n`);
      puntosVenta.forEach(pv => {
        const bloqueado = pv.Bloqueado === 'S' ? '🔒 BLOQUEADO' : '✅ Activo';
        const enUso = parseInt(pv.Nro) === PUNTO_VENTA ? ' ← EN USO' : '';
        console.log(`      • Nº ${String(pv.Nro).padStart(4, '0')} - ${bloqueado}${enUso}`);
      });
      console.log();
      
      const puntoEncontrado = puntosVenta.find(pv => parseInt(pv.Nro) === PUNTO_VENTA);
      if (!puntoEncontrado) {
        console.log(`   ⚠️  El punto de venta configurado (${PUNTO_VENTA}) NO existe\n`);
        console.log(`   ✅ SOLUCIÓN: Usa uno de los puntos de venta listados arriba\n`);
        console.log(`      Edita tu .env: AFIP_PUNTO_VENTA=${puntosVenta[0].Nro}\n`);
      }
      
    } else {
      console.log('   ⚠️  No se encontraron puntos de venta\n');
      console.log('   💡 Necesitas crear uno en el portal de AFIP\n');
    }
    
  } catch (error) {
    console.log('   ❌ No se pudieron consultar puntos de venta');
    console.log(`      ${error.message}\n`);
  }
  
  console.log('='.repeat(70));
  console.log('  FIN DEL DIAGNÓSTICO');
  console.log('='.repeat(70) + '\n');
}

diagnosticar().catch(error => {
  console.error('\n❌ ERROR FATAL:', error.message);
  console.error(error.stack);
  console.log();
});
