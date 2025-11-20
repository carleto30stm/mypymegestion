#!/usr/bin/env node

/**
 * Script para testear directamente la API del SDK (app.afipsdk.com)
 * y ver qué responde cuando pedimos un TA
 */

import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';

dotenv.config();

const SDK_ACCESS_TOKEN = process.env.SDK_ACCESS_TOKEN || '';
const AFIP_CUIT = process.env.AFIP_CUIT || '';
const AFIP_PRODUCTION = process.env.AFIP_PRODUCTION === 'true';
const CERT_PATH = process.env.AFIP_CERT_PATH || './certs/cert.crt';
const KEY_PATH = process.env.AFIP_KEY_PATH || './certs/private.key';

console.log('\n' + '='.repeat(70));
console.log('  TEST DIRECTO A API DE AFIPSDK');
console.log('='.repeat(70) + '\n');

console.log('📋 Configuración:\n');
console.log(`   SDK Access Token: ${SDK_ACCESS_TOKEN ? SDK_ACCESS_TOKEN.substring(0, 20) + '...' : 'NO CONFIGURADO'}`);
console.log(`   CUIT: ${AFIP_CUIT}`);
console.log(`   Production: ${AFIP_PRODUCTION}`);
console.log(`   Environment: ${AFIP_PRODUCTION ? 'PROD' : 'DEV'}`);
console.log(`   Certificado: ${CERT_PATH}`);
console.log(`   Clave privada: ${KEY_PATH}\n`);

async function testSDKAPI() {
  try {
    // Leer certificado y clave
    const cert = fs.readFileSync(CERT_PATH, 'utf-8');
    const key = fs.readFileSync(KEY_PATH, 'utf-8');
    
    console.log('✅ Certificado y clave cargados\n');
    
    // Preparar datos exactamente como lo hace el SDK
    const data = {
      environment: AFIP_PRODUCTION ? 'prod' : 'dev',
      wsid: 'wsfe',  // Servicio de facturación electrónica
      tax_id: AFIP_CUIT,
      cert: cert,
      key: key,
      force_create: true  // Forzar crear nuevo TA
    };
    
    console.log('📤 Datos enviados a SDK API:\n');
    console.log(`   URL: https://app.afipsdk.com/api/v1/afip/auth`);
    console.log(`   environment: "${data.environment}"`);
    console.log(`   wsid: "${data.wsid}"`);
    console.log(`   tax_id: ${data.tax_id}`);
    console.log(`   cert: ${cert.substring(0, 50)}...`);
    console.log(`   key: ${key.substring(0, 50)}...`);
    console.log(`   force_create: ${data.force_create}\n`);
    
    console.log('⏳ Haciendo request a app.afipsdk.com...\n');
    
    const client = axios.create({
      baseURL: 'https://app.afipsdk.com/api/',
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${SDK_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'sdk-version-number': '1.2.0',
        'sdk-library': 'javascript',
        'sdk-environment': AFIP_PRODUCTION ? 'prod' : 'dev'
      }
    });
    
    const response = await client.post('v1/afip/auth', data);
    
    console.log('✅ RESPUESTA EXITOSA:\n');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n' + '='.repeat(70));
    console.log('  ✅ SDK API FUNCIONA CORRECTAMENTE');
    console.log('='.repeat(70) + '\n');
    
  } catch (error) {
    console.log('❌ ERROR EN REQUEST:\n');
    
    if (error.response) {
      console.log(`   Status: ${error.response.status} ${error.response.statusText}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
      
      console.log('\n' + '='.repeat(70));
      console.log('  DIAGNÓSTICO');
      console.log('='.repeat(70) + '\n');
      
      if (error.response.status === 400) {
        console.log('❌ Error 400 (Bad Request)\n');
        console.log('   Posibles causas:\n');
        console.log('   1. El certificado NO está autorizado en WSASS-HOMO');
        console.log('   2. El CUIT no coincide con el certificado');
        console.log('   3. El environment (dev/prod) no coincide con donde está registrado el cert');
        console.log('\n   🔍 VERIFICAR:\n');
        console.log('   - Portal WSASS-HOMO: https://wsass-homo.afip.gob.ar/wsass/portal/main.aspx');
        console.log('   - Que el certificado esté asociado a "wsfe"');
        console.log('   - Que el CUIT del certificado sea 27118154520');
        console.log('   - Que esté en el ambiente CORRECTO (homo vs prod)\n');
      } else if (error.response.status === 401) {
        console.log('❌ Error 401 (Unauthorized)\n');
        console.log('   El SDK_ACCESS_TOKEN no es válido o expiró\n');
        console.log('   🔍 VERIFICAR:\n');
        console.log('   - Token en .env: SDK_ACCESS_TOKEN');
        console.log('   - Cuenta en https://app.afipsdk.com/\n');
      } else if (error.response.status === 500) {
        console.log('❌ Error 500 (Internal Server Error)\n');
        console.log('   Los servidores de AFIPSDK tienen un problema\n');
        console.log('   🔍 OPCIONES:\n');
        console.log('   - Reintentar en unos minutos');
        console.log('   - Contactar soporte: ayuda@afipsdk.com\n');
      }
    } else {
      console.log(`   ${error.message}\n`);
    }
    
    console.log('='.repeat(70) + '\n');
  }
}

testSDKAPI();
