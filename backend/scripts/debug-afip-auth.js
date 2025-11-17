#!/usr/bin/env node

import dotenv from 'dotenv';
import Afip from '@afipsdk/afip.js';

dotenv.config();

const AFIP_CONFIG = {
  CUIT: process.env.AFIP_CUIT || '',
  access_token: process.env.SDK_ACCESS_TOKEN || '',
  cert: process.env.AFIP_CERT_PATH || './certs/cert.crt',
  key: process.env.AFIP_KEY_PATH || './certs/private.key',
  production: process.env.AFIP_PRODUCTION === 'true',
  ta_folder: process.env.AFIP_TA_FOLDER || './afip_tokens'
};

async function main() {
  try {
    console.log('AFIP_CONFIG:', {
      CUIT: AFIP_CONFIG.CUIT,
      access_token: AFIP_CONFIG.access_token ? '✓' : '✗',
      cert: AFIP_CONFIG.cert,
      key: AFIP_CONFIG.key,
      production: AFIP_CONFIG.production
    });

    const afip = new Afip(AFIP_CONFIG);

    console.log('Probando getServerStatus...');
    const status = await afip.ElectronicBilling.getServerStatus();
    console.log('Server status:', status);

    console.log('Probando getLastVoucher...');
    const last = await afip.ElectronicBilling.getLastVoucher(Number(process.env.AFIP_PUNTO_VENTA || 1), 6);
    console.log('Last voucher:', last);

    console.log('Autenticación OK');
  } catch (err) {
    console.error('ERROR completo:');
    console.error(err);
    // Si axios-like error con response
    if (err && err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
    process.exit(1);
  }
}

main();
