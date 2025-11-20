#!/usr/bin/env node

/**
 * Script para crear un punto de venta en AFIP (Homologación)
 * Usa la automatización del SDK de AFIP
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
console.log('  CREAR PUNTO DE VENTA EN AFIP (Homologación)');
console.log('='.repeat(70) + '\n');

console.log('📋 Este script creará un punto de venta para facturación electrónica');
console.log('   en el ambiente de HOMOLOGACIÓN de AFIP.\n');

console.log('⚠️  REQUISITOS:');
console.log('   • SDK_ACCESS_TOKEN configurado en .env');
console.log('   • Usuario y contraseña de Clave Fiscal nivel 3 o superior');
console.log('   • Servicio WSFE autorizado (ya lo tienes)\n');

async function crearPuntoVenta() {
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
    
    const aliasInput = await pregunta('Alias del certificado (kurt): ');
    const alias = aliasInput.trim() || 'kurt';
    
    const numeroInput = await pregunta('Número del punto de venta a crear (1): ');
    const numero = numeroInput.trim() || '1';
    
    const descripcionInput = await pregunta('Descripción del punto de venta (Web Service - Homologación): ');
    const descripcion = descripcionInput.trim() || 'Web Service - Homologación';
    
    console.log('\n' + '-'.repeat(70));
    console.log('📋 Resumen del punto de venta:');
    console.log('-'.repeat(70));
    console.log(`   CUIT: ${cuit}`);
    console.log(`   Usuario: ${usernameValue}`);
    console.log(`   Alias certificado: ${alias}`);
    console.log(`   Número: ${numero}`);
    console.log(`   Descripción: ${descripcion}`);
    console.log(`   Ambiente: HOMOLOGACIÓN`);
    console.log('-'.repeat(70) + '\n');
    
    const confirmacion = await pregunta('¿Deseas continuar? (s/n): ');
    
    if (confirmacion.toLowerCase() !== 's') {
      console.log('\n❌ Operación cancelada\n');
      rl.close();
      return;
    }
    
    console.log('\n⏳ Creando punto de venta en AFIP...\n');
    
    const afip = new Afip({ access_token: SDK_ACCESS_TOKEN });
    
    const data = {
      cuit: cuit,
      username: usernameValue,
      password: password.trim(),
      alias: alias,
      number: parseInt(numero),
      description: descripcion
    };
    
    // Ejecutar la automatización para crear punto de venta
    const response = await afip.CreateAutomation("create-sales-point-dev", data, true);
    
    console.log('✅ PUNTO DE VENTA CREADO EXITOSAMENTE\n');
    console.log('📋 Respuesta de AFIP:\n');
    console.log(JSON.stringify(response, null, 2));
    console.log('\n' + '='.repeat(70));
    console.log('  PRÓXIMOS PASOS:');
    console.log('='.repeat(70) + '\n');
    console.log('1. Verifica que el punto de venta esté disponible:');
    console.log('   npm run afip:listar-puntos\n');
    console.log('2. Prueba la autenticación completa:');
    console.log('   npm run afip:test-conexion\n');
    console.log('3. Crea una factura de prueba:');
    console.log('   npm run afip:test-completo 1\n');
    
  } catch (error) {
    console.log('\n❌ ERROR AL CREAR PUNTO DE VENTA\n');
    console.log('📋 Mensaje de error:\n');
    console.log(`   ${error.message}\n`);
    
    if (error.response) {
      console.log('📋 Respuesta del servidor:\n');
      console.log(JSON.stringify(error.response.data, null, 2));
      console.log();
    }
    
    console.log('💡 POSIBLES CAUSAS:\n');
    console.log('   • Usuario o contraseña incorrectos');
    console.log('   • El punto de venta ya existe');
    console.log('   • El CUIT no tiene permisos suficientes');
    console.log('   • El servicio WSFE no está autorizado');
    console.log('   • Problemas de conectividad con AFIP\n');
    console.log('✅ SOLUCIONES:\n');
    console.log('   • Verifica las credenciales de Clave Fiscal');
    console.log('   • Asegúrate de tener Clave Fiscal nivel 3 o superior');
    console.log('   • Verifica que WSFE esté autorizado: npm run afip:verificar-estado');
    console.log('   • Intenta crear el punto de venta manualmente desde:');
    console.log('     https://www.afip.gob.ar/ → Administración de Puntos de Venta\n');
  } finally {
    rl.close();
  }
}

crearPuntoVenta();
