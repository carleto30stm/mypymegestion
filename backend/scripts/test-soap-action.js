/**
 * Test SOAP con SOAPAction - Probando con SOAPAction específico
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSoapAction() {
  console.log('🧪 Test SOAP con SOAPAction - AFIP WSFE\n');

  // Leer TA
  const taPath = path.join(__dirname, '../afip_tokens/TA-wsfe.json');
  const ta = JSON.parse(fs.readFileSync(taPath, 'utf8'));

  const cuit = '27118154520';

  // Test: FEDummy con SOAPAction
  console.log('📋 Test: FEDummy con SOAPAction específico');
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

  console.log('📤 Enviando request con SOAPAction...\n');

  try {
    const response = await axios.post(
      'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
      soapDummy,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FEDummy'
        },
        timeout: 30000
      }
    );

    console.log('✅ Response HTTP Status:', response.status);
    console.log('📦 Response Content-Type:', response.headers['content-type']);
    console.log('📏 Response Length:', response.data.length);
    console.log('\n========== RESPONSE DATA ==========');
    console.log(response.data.substring(0, 1000));
    console.log('========== END RESPONSE ==========\n');

    if (response.data.includes('<html>')) {
      console.log('❌ AFIP devolvió HTML (ERROR)');
      const match = response.data.match(/<title><\/title>(\d+)<\/head>/);
      if (match) {
        console.log('🆔 Error ID:', match[1]);
      }
    } else if (response.data.includes('soap:Envelope') || response.data.includes('soapenv:Envelope')) {
      console.log('✅✅✅ AFIP devolvió XML SOAP válido ✅✅✅');
      console.log('🎉🎉🎉 ¡¡¡SUCCESS!!! SOAPAction era necesario 🎉🎉🎉');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

testSoapAction().catch(console.error);
