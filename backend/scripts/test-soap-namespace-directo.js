/**
 * Test SOAP Namespace Directo - Namespace en el elemento del método
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSoapNamespaceDirect() {
  console.log('🧪 Test SOAP Namespace Directo - AFIP WSFE\n');

  // Leer TA
  const taPath = path.join(__dirname, '../afip_tokens/TA-wsfe.json');
  const ta = JSON.parse(fs.readFileSync(taPath, 'utf8'));

  const cuit = '27118154520';

  // Test: FEDummy con namespace SOLO en FEDummy
  console.log('📋 Test: FEDummy con namespace directo en el método');
  const soapDummy = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <FEDummy xmlns="http://ar.gov.afip.dif.FEV1/">
      <Auth>
        <Token>${ta.token}</Token>
        <Sign>${ta.sign}</Sign>
        <Cuit>${cuit}</Cuit>
      </Auth>
    </FEDummy>
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
      console.log('🎉🎉🎉 ¡¡¡SUCCESS!!! Este formato funciona 🎉🎉🎉');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

testSoapNamespaceDirect().catch(console.error);
