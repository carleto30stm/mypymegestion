/**
 * Test SOAP Minimal - Prueba con request SOAP mínimo a AFIP
 * 
 * Este script envía un request SOAP básico para FEDummy (sin parámetros)
 * para verificar si el problema es con la estructura SOAP o con los datos.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSoapMinimal() {
  console.log('🧪 Test SOAP Minimal - AFIP WSFE\n');

  // Leer TA
  const taPath = path.join(__dirname, '../afip_tokens/TA-wsfe.json');
  const ta = JSON.parse(fs.readFileSync(taPath, 'utf8'));

  console.log('✅ TA cargado:');
  console.log('  - Token (primeros 50 chars):', ta.token.substring(0, 50) + '...');
  console.log('  - Sign (primeros 50 chars):', ta.sign.substring(0, 50) + '...');
  console.log('  - Expira:', ta.expirationTime);
  console.log('  - Destination:', ta.destination);
  console.log('');

  // CUIT de la empresa
  const cuit = '27118154520';

  // Test 1: FEDummy (método más simple, sin parámetros adicionales)
  console.log('📋 Test 1: FEDummy (método más simple)');
  const soapDummy = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FEDummy>
      <ar:Auth>
        <ar:Token>${ta.token}</ar:Token>
        <ar:Sign>${ta.sign}</ar:Sign>
        <ar:Cuit>${cuit}</ar:Cuit>
      </ar:Auth>
    </ar:FEDummy>
  </soapenv:Body>
</soapenv:Envelope>`;

  console.log('📤 Enviando request...\n');

  try {
    const response = await axios.post(
      'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
      soapDummy,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': ''
        },
        timeout: 30000
      }
    );

    console.log('✅ Response HTTP Status:', response.status);
    console.log('📦 Response Content-Type:', response.headers['content-type']);
    console.log('📏 Response Length:', response.data.length);
    console.log('\n========== RESPONSE DATA ==========');
    console.log(response.data);
    console.log('========== END RESPONSE ==========\n');

    // Verificar si es HTML o XML
    if (response.data.includes('<html>')) {
      console.log('❌ AFIP devolvió HTML (ERROR)');
      // Extraer ID de error si existe
      const match = response.data.match(/<title><\/title>(\d+)<\/head>/);
      if (match) {
        console.log('🆔 Error ID:', match[1]);
      }
    } else if (response.data.includes('soap:Envelope') || response.data.includes('soapenv:Envelope')) {
      console.log('✅ AFIP devolvió XML SOAP válido');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(60));

  // Test 2: FECompUltimoAutorizado (con parámetros)
  console.log('\n📋 Test 2: FECompUltimoAutorizado (con parámetros)');
  const soapUltimo = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECompUltimoAutorizado>
      <ar:Auth>
        <ar:Token>${ta.token}</ar:Token>
        <ar:Sign>${ta.sign}</ar:Sign>
        <ar:Cuit>${cuit}</ar:Cuit>
      </ar:Auth>
      <ar:PtoVta>2</ar:PtoVta>
      <ar:CbteTipo>11</ar:CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soapenv:Body>
</soapenv:Envelope>`;

  console.log('📤 Enviando request...\n');

  try {
    const response = await axios.post(
      'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
      soapUltimo,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': ''
        },
        timeout: 30000
      }
    );

    console.log('✅ Response HTTP Status:', response.status);
    console.log('📦 Response Content-Type:', response.headers['content-type']);
    console.log('📏 Response Length:', response.data.length);
    console.log('\n========== RESPONSE DATA ==========');
    console.log(response.data);
    console.log('========== END RESPONSE ==========\n');

    // Verificar si es HTML o XML
    if (response.data.includes('<html>')) {
      console.log('❌ AFIP devolvió HTML (ERROR)');
      const match = response.data.match(/<title><\/title>(\d+)<\/head>/);
      if (match) {
        console.log('🆔 Error ID:', match[1]);
      }
    } else if (response.data.includes('soap:Envelope') || response.data.includes('soapenv:Envelope')) {
      console.log('✅ AFIP devolvió XML SOAP válido');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

testSoapMinimal().catch(console.error);
