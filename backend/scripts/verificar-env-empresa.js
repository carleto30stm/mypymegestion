#!/usr/bin/env node

/**
 * Script para verificar que las variables de entorno de la empresa estén configuradas
 */

import dotenv from 'dotenv';

dotenv.config();

console.log('\n' + '='.repeat(70));
console.log('  VERIFICACIÓN DE VARIABLES DE ENTORNO - EMPRESA');
console.log('='.repeat(70) + '\n');

const variables = [
  'EMPRESA_CUIT',
  'EMPRESA_RAZON_SOCIAL',
  'EMPRESA_DOMICILIO',
  'EMPRESA_CONDICION_IVA',
  'EMPRESA_IIBB',
  'EMPRESA_INICIO_ACTIVIDADES',
  'AFIP_PUNTO_VENTA'
];

let todasOK = true;

variables.forEach(varName => {
  const valor = process.env[varName];
  const ok = valor && valor.trim() !== '';
  
  console.log(`${ok ? '✅' : '❌'} ${varName}:`);
  console.log(`   ${valor || '(NO CONFIGURADA)'}\n`);
  
  if (!ok) todasOK = false;
});

console.log('='.repeat(70));

if (todasOK) {
  console.log('  ✅ TODAS LAS VARIABLES ESTÁN CONFIGURADAS');
  console.log('='.repeat(70) + '\n');
  process.exit(0);
} else {
  console.log('  ❌ FALTAN VARIABLES');
  console.log('='.repeat(70) + '\n');
  console.log('💡 Asegúrate de que el archivo .env contiene:\n');
  variables.forEach(v => {
    console.log(`   ${v}=valor`);
  });
  console.log();
  process.exit(1);
}
