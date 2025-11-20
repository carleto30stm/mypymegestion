/**
 * Script de migración para actualizar clientes existentes con requisitos AFIP
 * 
 * Este script:
 * 1. Identifica clientes con requiereFacturaAFIP=true que tienen datos incompletos
 * 2. Genera un reporte de clientes que necesitan actualización
 * 3. Opcionalmente marca clientes como inactivos si no tienen datos mínimos
 * 
 * USO:
 *   node scripts/migrar-clientes-afip.js --report     # Solo reporte
 *   node scripts/migrar-clientes-afip.js --fix        # Aplica correcciones automáticas
 */

import mongoose from 'mongoose';
import Cliente from '../src/models/Cliente.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

const args = process.argv.slice(2);
const modoReporte = args.includes('--report') || args.length === 0;
const modoFix = args.includes('--fix');

// Conectar a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mygestor';

async function conectarDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
}

// Validar formato CUIT/CUIL
function validarCUIT(numeroDocumento) {
  const soloNumeros = numeroDocumento.replace(/[^0-9]/g, '');
  return soloNumeros.length === 11;
}

// Validar formato DNI
function validarDNI(numeroDocumento) {
  const soloNumeros = numeroDocumento.replace(/[^0-9]/g, '');
  return soloNumeros.length >= 7 && soloNumeros.length <= 8;
}

// Validar email
function validarEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function analizarClientes() {
  console.log('\n🔍 ANALIZANDO CLIENTES CON FACTURACIÓN AFIP...\n');
  
  const clientesAFIP = await Cliente.find({ requiereFacturaAFIP: true });
  
  console.log(`📊 Total de clientes con facturación AFIP: ${clientesAFIP.length}\n`);
  
  const problemas = {
    documentoInvalido: [],
    sinEmail: [],
    sinDireccion: [],
    sinCiudad: [],
    sinCodigoPostal: [],
    sinRazonSocialNiNombre: []
  };
  
  for (const cliente of clientesAFIP) {
    const errores = [];
    
    // Validar formato documento
    if (cliente.tipoDocumento === 'CUIT' || cliente.tipoDocumento === 'CUIL') {
      if (!validarCUIT(cliente.numeroDocumento)) {
        errores.push('CUIT/CUIL inválido (debe tener 11 dígitos)');
        problemas.documentoInvalido.push(cliente);
      }
    } else if (cliente.tipoDocumento === 'DNI') {
      if (!validarDNI(cliente.numeroDocumento)) {
        errores.push('DNI inválido (debe tener 7-8 dígitos)');
        problemas.documentoInvalido.push(cliente);
      }
    }
    
    // Validar email
    if (!validarEmail(cliente.email)) {
      errores.push('Sin email válido');
      problemas.sinEmail.push(cliente);
    }
    
    // Validar dirección
    if (!cliente.direccion) {
      errores.push('Sin dirección');
      problemas.sinDireccion.push(cliente);
    }
    
    // Validar ciudad
    if (!cliente.ciudad) {
      errores.push('Sin ciudad');
      problemas.sinCiudad.push(cliente);
    }
    
    // Validar código postal (solo para Consumidor Final y Monotributista)
    if (cliente.condicionIVA !== 'Responsable Inscripto' && !cliente.codigoPostal) {
      errores.push('Sin código postal');
      problemas.sinCodigoPostal.push(cliente);
    }
    
    // Validar razón social o nombre
    if (!cliente.razonSocial && !cliente.nombre) {
      errores.push('Sin razón social ni nombre');
      problemas.sinRazonSocialNiNombre.push(cliente);
    }
    
    if (errores.length > 0) {
      console.log(`⚠️  ${cliente.numeroDocumento} - ${cliente.razonSocial || cliente.nombre || 'SIN NOMBRE'}`);
      console.log(`   Problemas: ${errores.join(', ')}`);
      console.log(`   Estado: ${cliente.estado}`);
      console.log('');
    }
  }
  
  // Resumen
  console.log('\n📋 RESUMEN DE PROBLEMAS:\n');
  console.log(`❌ Documentos inválidos: ${problemas.documentoInvalido.length}`);
  console.log(`📧 Sin email: ${problemas.sinEmail.length}`);
  console.log(`🏠 Sin dirección: ${problemas.sinDireccion.length}`);
  console.log(`🏙️  Sin ciudad: ${problemas.sinCiudad.length}`);
  console.log(`📮 Sin código postal: ${problemas.sinCodigoPostal.length}`);
  console.log(`📝 Sin razón social/nombre: ${problemas.sinRazonSocialNiNombre.length}`);
  
  const totalProblemas = new Set([
    ...problemas.documentoInvalido,
    ...problemas.sinEmail,
    ...problemas.sinDireccion,
    ...problemas.sinCiudad,
    ...problemas.sinCodigoPostal,
    ...problemas.sinRazonSocialNiNombre
  ]).size;
  
  console.log(`\n⚠️  Total de clientes con problemas: ${totalProblemas} de ${clientesAFIP.length}\n`);
  
  return problemas;
}

async function aplicarCorrecciones(problemas) {
  console.log('\n🔧 APLICANDO CORRECCIONES AUTOMÁTICAS...\n');
  
  let corregidos = 0;
  let noCorregibles = [];
  
  // Intentar corregir automáticamente
  const clientesProblematicos = new Set([
    ...problemas.documentoInvalido,
    ...problemas.sinEmail,
    ...problemas.sinDireccion,
    ...problemas.sinCiudad,
    ...problemas.sinCodigoPostal
  ]);
  
  for (const cliente of clientesProblematicos) {
    let modificado = false;
    
    // Si no tiene email, intentar construir uno genérico (debe ser actualizado manualmente)
    if (!validarEmail(cliente.email)) {
      const emailGenerico = `${cliente.numeroDocumento}@actualizar.com`;
      cliente.email = emailGenerico;
      modificado = true;
      console.log(`📧 ${cliente.numeroDocumento}: Email genérico asignado (${emailGenerico}) - REQUIERE ACTUALIZACIÓN MANUAL`);
    }
    
    // Si no tiene dirección, poner placeholder
    if (!cliente.direccion) {
      cliente.direccion = 'A COMPLETAR';
      modificado = true;
      console.log(`🏠 ${cliente.numeroDocumento}: Dirección placeholder - REQUIERE ACTUALIZACIÓN MANUAL`);
    }
    
    // Si no tiene ciudad, poner placeholder
    if (!cliente.ciudad) {
      cliente.ciudad = 'A COMPLETAR';
      modificado = true;
      console.log(`🏙️  ${cliente.numeroDocumento}: Ciudad placeholder - REQUIERE ACTUALIZACIÓN MANUAL`);
    }
    
    // Si no tiene código postal y es necesario, poner placeholder
    if (cliente.condicionIVA !== 'Responsable Inscripto' && !cliente.codigoPostal) {
      cliente.codigoPostal = '0000';
      modificado = true;
      console.log(`📮 ${cliente.numeroDocumento}: Código postal placeholder - REQUIERE ACTUALIZACIÓN MANUAL`);
    }
    
    // Documentos inválidos: NO se pueden corregir automáticamente
    if (problemas.documentoInvalido.includes(cliente)) {
      noCorregibles.push(cliente);
      console.log(`❌ ${cliente.numeroDocumento}: DOCUMENTO INVÁLIDO - CORRECCIÓN MANUAL OBLIGATORIA`);
      continue;
    }
    
    if (modificado) {
      try {
        // Desactivar validación temporal para permitir guardar placeholders
        await cliente.save({ validateBeforeSave: false });
        corregidos++;
      } catch (error) {
        console.error(`❌ Error al guardar ${cliente.numeroDocumento}:`, error.message);
        noCorregibles.push(cliente);
      }
    }
  }
  
  console.log(`\n✅ Clientes corregidos (con placeholders): ${corregidos}`);
  console.log(`⚠️  Clientes que requieren corrección MANUAL: ${noCorregibles.length}\n`);
  
  if (noCorregibles.length > 0) {
    console.log('📋 LISTA DE CLIENTES PARA CORRECCIÓN MANUAL:\n');
    noCorregibles.forEach(c => {
      console.log(`   ${c.numeroDocumento} - ${c.razonSocial || c.nombre || 'SIN NOMBRE'}`);
    });
    console.log('');
  }
  
  console.log('⚠️  IMPORTANTE: Los campos marcados como "A COMPLETAR" y emails "@actualizar.com"');
  console.log('   DEBEN ser actualizados manualmente antes de facturar en producción.\n');
}

async function main() {
  await conectarDB();
  
  console.log('='.repeat(70));
  console.log('  MIGRACIÓN DE CLIENTES PARA FACTURACIÓN AFIP - PRODUCCIÓN');
  console.log('='.repeat(70));
  
  const problemas = await analizarClientes();
  
  if (modoFix) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\n⚠️  ¿Aplicar correcciones automáticas? (s/n): ', async (respuesta) => {
      if (respuesta.toLowerCase() === 's') {
        await aplicarCorrecciones(problemas);
      } else {
        console.log('\n❌ Operación cancelada\n');
      }
      
      rl.close();
      await mongoose.disconnect();
      console.log('✅ Desconectado de MongoDB\n');
    });
  } else {
    console.log('\n💡 Ejecuta con --fix para aplicar correcciones automáticas');
    console.log('   (Se asignarán valores placeholder que deben actualizarse manualmente)\n');
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB\n');
  }
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
