#!/usr/bin/env node

/**
 * Script para autorizar el servicio WSFE en AFIP (ambiente Homologación)
 * Usa el SDK de AFIP para automatizar la autorización del servicio
 * 
 * IMPORTANTE: Este script requiere credenciales de AFIP (usuario y contraseña de Clave Fiscal)
 */

import dotenv from 'dotenv';
import Afip from '@afipsdk/afip.js';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

console.log('\n' + '='.repeat(70));
console.log('  AUTORIZACIÓN DE SERVICIO WSFE EN AFIP (Homologación)');
console.log('='.repeat(70) + '\n');

console.log('📋 Este script autorizará el servicio WSFE para tu CUIT en el');
console.log('   ambiente de HOMOLOGACIÓN de AFIP.\n');

console.log('⚠️  REQUISITOS:');
console.log('   • SDK_ACCESS_TOKEN configurado en .env');
console.log('   • Usuario y contraseña de Clave Fiscal nivel 3 o superior');
console.log('   • El CUIT debe tener acceso al servicio de Facturación\n');

async function autorizarServicio() {
  try {
    const SDK_ACCESS_TOKEN = process.env.SDK_ACCESS_TOKEN;
    
    if (!SDK_ACCESS_TOKEN) {
      console.log('❌ ERROR: SDK_ACCESS_TOKEN no configurado en .env\n');
      console.log('   Obtén un token en: https://developers.afipsdk.com/\n');
      rl.close();
      return;
    }
    
    console.log('✅ SDK_ACCESS_TOKEN encontrado\n');
    
    // Solicitar datos al usuario
    console.log('📝 Ingresa los siguientes datos:\n');
    
    const cuitInput = await pregunta(`CUIT (${process.env.AFIP_CUIT || 'sin valor en .env'}): `);
    const cuit = cuitInput.trim() || process.env.AFIP_CUIT;
    
    if (!cuit) {
      console.log('\n❌ ERROR: CUIT es obligatorio\n');
      rl.close();
      return;
    }
    
    const username = await pregunta(`Usuario Clave Fiscal (${cuit}): `);
    const usernameValue = username.trim() || cuit;
    
    const password = await pregunta('Contraseña Clave Fiscal: ');
    
    if (!password.trim()) {
      console.log('\n❌ ERROR: Contraseña es obligatoria\n');
      rl.close();
      return;
    }
    
    const aliasInput = await pregunta('Alias para el certificado (afipsdk): ');
    const alias = aliasInput.trim() || 'afipsdk';
    
    const serviceInput = await pregunta('Servicio a autorizar (wsfe): ');
    const service = serviceInput.trim() || 'wsfe';
    
    console.log('\n' + '-'.repeat(70));
    console.log('📋 Resumen de la autorización:');
    console.log('-'.repeat(70));
    console.log(`   CUIT: ${cuit}`);
    console.log(`   Usuario: ${usernameValue}`);
    console.log(`   Alias: ${alias}`);
    console.log(`   Servicio: ${service}`);
    console.log(`   Ambiente: HOMOLOGACIÓN`);
    console.log('-'.repeat(70) + '\n');
    
    const confirmacion = await pregunta('¿Deseas continuar? (s/n): ');
    
    if (confirmacion.toLowerCase() !== 's') {
      console.log('\n❌ Operación cancelada\n');
      rl.close();
      return;
    }
    
    console.log('\n⏳ Autorizando servicio en AFIP...\n');
    
    const afip = new Afip({ access_token: SDK_ACCESS_TOKEN });
    
    const data = {
      cuit: cuit,
      username: usernameValue,
      password: password.trim(),
      alias: alias,
      service: service
    };
    
    // Ejecutar la automatización
    const response = await afip.CreateAutomation("auth-web-service-dev", data, true);
    
    console.log('✅ AUTORIZACIÓN EXITOSA\n');
    console.log('📋 Respuesta de AFIP:\n');
    console.log(JSON.stringify(response, null, 2));
    console.log('\n' + '='.repeat(70));
    console.log('  PRÓXIMOS PASOS:');
    console.log('='.repeat(70) + '\n');
    console.log('1. Verifica que el servicio esté autorizado:');
    console.log('   npm run afip:verificar-estado\n');
    console.log('2. Lista los puntos de venta disponibles:');
    console.log('   npm run afip:listar-puntos\n');
    console.log('3. Ejecuta el diagnóstico completo:');
    console.log('   npm run afip:diagnostico\n');
    
  } catch (error) {
    console.log('\n❌ ERROR AL AUTORIZAR SERVICIO\n');
    console.log('📋 Mensaje de error:\n');
    console.log(`   ${error.message}\n`);
    
    if (error.response) {
      console.log('📋 Respuesta del servidor:\n');
      console.log(JSON.stringify(error.response.data, null, 2));
      console.log();
    }
    
    console.log('💡 POSIBLES CAUSAS:\n');
    console.log('   • Usuario o contraseña incorrectos');
    console.log('   • El CUIT no tiene permisos para autorizar servicios');
    console.log('   • El servicio ya está autorizado');
    console.log('   • Problemas de conectividad con AFIP\n');
    console.log('✅ SOLUCIONES:\n');
    console.log('   • Verifica las credenciales de Clave Fiscal');
    console.log('   • Asegúrate de tener Clave Fiscal nivel 3 o superior');
    console.log('   • Intenta autorizar manualmente desde:');
    console.log('     https://www.afip.gob.ar/ → Administrador de Relaciones\n');
  } finally {
    rl.close();
  }
}

autorizarServicio();