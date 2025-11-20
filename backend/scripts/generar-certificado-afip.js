#!/usr/bin/env node

/**
 * Script para generar certificados AFIP automáticamente
 * para ambiente de desarrollo/homologación
 * 
 * Este script usa la automatización create-cert-dev del SDK de AFIP
 * para generar tanto la clave privada como el certificado público.
 * 
 * Uso: node scripts/generar-certificado-afip.js
 */

import Afip from '@afipsdk/afip.js';
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
  console.log('  Generador de Certificados AFIP - Ambiente Desarrollo');
  console.log('='.repeat(70) + '\n');
}

function mostrarInfo() {
  console.log('ℹ️  Este script generará automáticamente:');
  console.log('   • Clave privada (private.key)');
  console.log('   • Certificado público (cert.crt)');
  console.log('   • Los guardará en la carpeta backend/certs/\n');
  console.log('⚠️  IMPORTANTE:');
  console.log('   • Solo funciona para ambiente de HOMOLOGACIÓN (testing)');
  console.log('   • Necesitas CUIT y Clave Fiscal nivel 3 de AFIP');
  console.log('   • Para producción deberás usar el método manual con OpenSSL\n');
  console.log('📋 Conceptos:');
  console.log('   • REPRESENTADO: CUIT de la empresa/sociedad (aparece en certificado)');
  console.log('   • REPRESENTANTE (Usuario): Tu CUIT personal (para login AFIP)');
  console.log('   • Si sos monotributista/autónomo, ambos CUITs son el mismo\n');
}

async function obtenerDatos() {
  const cuitEnv = process.env.AFIP_CUIT || '';
  const empresaCuit = process.env.EMPRESA_CUIT || '';
  
  console.log('📝 Ingresa los siguientes datos:\n');
  console.log('ℹ️  Notas importantes:');
  console.log('   • CUIT Representado: CUIT de la empresa/sociedad para el certificado');
  console.log('   • CUIT Usuario: Tu CUIT personal para loguearte en AFIP');
  console.log('   • Si son la misma persona, usa el mismo CUIT en ambos\n');
  
  // CUIT del representado (empresa/sociedad)
  let cuit = await pregunta(`   CUIT Representado (empresa) [${empresaCuit || cuitEnv}]: `);
  if (!cuit.trim()) {
    cuit = empresaCuit || cuitEnv;
  }
  
  if (!cuit || cuit.length !== 11) {
    throw new Error('CUIT inválido. Debe tener 11 dígitos sin guiones.');
  }
  
  // Username (CUIT del representante - quien se loguea)
  let username = await pregunta(`   CUIT Usuario (tu CUIT personal) [${cuit}]: `);
  if (!username.trim()) {
    username = cuit;
  }
  
  if (!username || username.length !== 11) {
    throw new Error('CUIT de usuario inválido. Debe tener 11 dígitos sin guiones.');
  }
  
  // Contraseña
  console.log('   Contraseña AFIP (Clave Fiscal del usuario): ');
  const password = await pregunta('   (oculta) > ');
  
  if (!password.trim()) {
    throw new Error('La contraseña es obligatoria.');
  }
  
  // Alias
  let alias = await pregunta('   Alias del certificado [migestor-dev]: ');
  if (!alias.trim()) {
    alias = 'migestor-dev';
  }
  
  // Validar alias (solo alfanumérico y guiones)
  if (!/^[a-zA-Z0-9\-]+$/.test(alias)) {
    throw new Error('El alias solo puede contener letras, números y guiones.');
  }
  
  return { cuit, username, password, alias };
}

async function generarCertificado(datos) {
  console.log('\n🔄 Generando certificado...\n');
  console.log('   ⏳ Esto puede tardar unos segundos...');
  console.log('   • Conectando con AFIP...');
  
  try {
    const accessToken = process.env.SDK_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('SDK_ACCESS_TOKEN no configurado en .env');
    }
    
    // Inicializar SDK de AFIP con access_token
    const afip = new Afip({
      CUIT: datos.cuit,
      access_token: accessToken,
      production: false, // Siempre false para desarrollo
    });
    
    console.log('   • Autenticando con SDK...');
    console.log('   • Autenticando con tus credenciales AFIP...');
    console.log('   • Generando clave privada...');
    console.log('   • Creando solicitud de certificado...');
    console.log('   • Subiendo a AFIP...');
    console.log('   • Descargando certificado firmado...');
    
    // Ejecutar la automatización
    const response = await afip.CreateAutomation("create-cert-dev", {
      cuit: datos.cuit,
      username: datos.username,
      password: datos.password,
      alias: datos.alias
    }, true);
    
    console.log('   ✅ Respuesta recibida de AFIP');
    
    // Debug: mostrar estructura de la respuesta
    console.log('\n📋 Debug - Estructura de respuesta:');
    console.log('   Claves disponibles:', Object.keys(response));
    
    return response;
    
  } catch (error) {
    console.error('\n❌ Error al generar certificado:', error.message);
    
    // Mostrar detalles del error si están disponibles
    if (error.response?.data) {
      console.error('\n📋 Detalles del error:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.message.includes('400')) {
      console.log('\n💡 Error 400 - Solicitud inválida:');
      console.log('   • CUIT de prueba (20111111112) no es válido para AFIP real');
      console.log('   • Necesitas usar tu CUIT personal real');
      console.log('   • O el CUIT de tu cliente con su contraseña');
      console.log('   • El CUIT debe tener habilitada Facturación Electrónica');
    }
    
    if (error.message.includes('credentials') || error.message.includes('password') || error.message.includes('401')) {
      console.log('\n💡 Posibles causas:');
      console.log('   • CUIT o contraseña incorrectos');
      console.log('   • Tu usuario no tiene permisos en AFIP');
      console.log('   • Clave Fiscal bloqueada o vencida');
    }
    
    if (error.message.includes('connection') || error.message.includes('network')) {
      console.log('\n💡 Posibles causas:');
      console.log('   • Sin conexión a internet');
      console.log('   • Servidor de AFIP no disponible');
    }
    
    throw error;
  }
}

function guardarCertificados(response) {
  console.log('\n💾 Guardando certificados...\n');
  
  // Validar que la respuesta tenga los datos necesarios
  if (!response || !response.data) {
    console.error('❌ La respuesta no contiene datos de certificados');
    console.error('   Respuesta completa:', JSON.stringify(response, null, 2));
    throw new Error('Respuesta inválida del SDK - No se encontraron certificados');
  }
  
  const data = response.data;
  
  if (!data.key || !data.cert) {
    console.error('❌ Los datos no contienen certificado o clave');
    throw new Error('Respuesta inválida - Faltan cert o key en data');
  }
  
  const certsDir = path.resolve(process.cwd(), 'certs');
  
  // Crear carpeta certs si no existe
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
    console.log('   📁 Carpeta certs/ creada');
  }
  
  // Guardar clave privada
  const keyPath = path.join(certsDir, 'private.key');
  fs.writeFileSync(keyPath, data.key);
  console.log(`   ✅ Clave privada guardada: ${keyPath}`);
  
  // Guardar certificado
  const certPath = path.join(certsDir, 'cert.crt');
  fs.writeFileSync(certPath, data.cert);
  console.log(`   ✅ Certificado guardado: ${certPath}`);
  
  return { keyPath, certPath };
}

function mostrarResumen(datos, archivos) {
  console.log('\n' + '='.repeat(70));
  console.log('  ✅ CERTIFICADOS GENERADOS EXITOSAMENTE');
  console.log('='.repeat(70) + '\n');
  
  console.log('📋 Información del certificado:\n');
  console.log(`   CUIT:          ${datos.cuit}`);
  console.log(`   Alias:         ${datos.alias}`);
  console.log(`   Ambiente:      HOMOLOGACIÓN (desarrollo)`);
  console.log(`   Válido para:   Testing y desarrollo\n`);
  
  console.log('📂 Archivos generados:\n');
  console.log(`   ${archivos.keyPath}`);
  console.log(`   ${archivos.certPath}\n`);
  
  console.log('📝 Próximos pasos:\n');
  console.log('   1. Verifica tu .env:');
  console.log('      AFIP_CERT_PATH=./certs/cert.crt');
  console.log('      AFIP_KEY_PATH=./certs/private.key');
  console.log('      AFIP_PRODUCTION=false\n');
  console.log('   2. Prueba la conexión:');
  console.log('      npm run test:afip-conexion\n');
  console.log('   3. Crea datos de prueba:');
  console.log('      npm run test:afip-datos\n');
  console.log('   4. Genera una factura de prueba:');
  console.log('      npm run test:afip-completo 1\n');
  
  console.log('⚠️  RECORDATORIO:\n');
  console.log('   • Estos certificados son SOLO para desarrollo/testing');
  console.log('   • NO uses estos certificados en producción');
  console.log('   • Para producción necesitarás certificados generados manualmente\n');
  
  console.log('='.repeat(70) + '\n');
}

async function main() {
  try {
    mostrarBanner();
    mostrarInfo();
    
    const datos = await obtenerDatos();
    
    console.log('\n⚠️  Estás a punto de generar certificados con estos datos:');
    console.log(`   CUIT Representado (empresa): ${datos.cuit}`);
    console.log(`   CUIT Usuario (login AFIP): ${datos.username}`);
    console.log(`   Alias: ${datos.alias}`);
    
    const confirmar = await pregunta('\n   ¿Continuar? (s/n): ');
    
    if (confirmar.toLowerCase() !== 's' && confirmar.toLowerCase() !== 'si') {
      console.log('\n❌ Operación cancelada\n');
      rl.close();
      return;
    }
    
    const response = await generarCertificado(datos);
    const archivos = guardarCertificados(response);
    mostrarResumen(datos, archivos);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log();
  } finally {
    rl.close();
  }
}

main();
