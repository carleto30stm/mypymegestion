#!/usr/bin/env node

/**
 * Script completo de prueba AFIP - Facturación Electrónica
 * 
 * Genera múltiples escenarios de prueba para validar:
 * - Facturas A, B y C
 * - Notas de crédito
 * - Diferentes condiciones de IVA
 * - Validaciones
 * 
 * Uso:
 *   node scripts/test-afip-completo.js [escenario]
 * 
 * Escenarios disponibles:
 *   1 - Factura B (Monotributista)
 *   2 - Factura A (Responsable Inscripto)
 *   3 - Factura C (Consumidor Final)
 *   4 - Validación sin envío a AFIP
 *   5 - Consultar último comprobante
 *   6 - Verificar estado del servidor
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Cliente from '../src/models/Cliente.js';
import Factura from '../src/models/Factura.js';
import AFIPService from '../src/services/afipService.js';

dotenv.config();

// ==================== CONFIGURACIÓN ====================

const AFIP_CONFIG = {
  CUIT: process.env.AFIP_CUIT || '',
  cert: process.env.AFIP_CERT_PATH || './certs/cert.crt',
  key: process.env.AFIP_KEY_PATH || './certs/private.key',
  production: false, // HOMOLOGACIÓN
  ta_folder: process.env.AFIP_TA_FOLDER || './afip_tokens'
};

const EMPRESA = {
  cuit: process.env.EMPRESA_CUIT || '',
  razonSocial: process.env.EMPRESA_RAZON_SOCIAL || 'Test SA',
  domicilio: process.env.EMPRESA_DOMICILIO || 'Calle Falsa 123',
  condicionIVA: 'Responsable Inscripto',
  ingresosBrutos: process.env.EMPRESA_IIBB || '',
  inicioActividades: new Date('2020-01-01'),
  puntoVenta: parseInt(process.env.AFIP_PUNTO_VENTA || '1')
};

// Clientes de prueba según condición IVA
const CLIENTES_PRUEBA = [
  {
    tipoDocumento: 'CUIT',
    numeroDocumento: '20123456789',
    nombre: 'Juan',
    apellido: 'Pérez',
    razonSocial: 'Juan Pérez',
    email: 'juan.perez@test.com',
    telefono: '1134567890',
    direccion: 'Av. Corrientes 1234',
    ciudad: 'Buenos Aires',
    provincia: 'Buenos Aires',
    condicionIVA: 'Monotributista',
    estado: 'activo'
  },
  {
    tipoDocumento: 'CUIT',
    numeroDocumento: '30987654321',
    nombre: 'María',
    apellido: 'González',
    razonSocial: 'González SA',
    email: 'maria@gonzalez.com',
    telefono: '1145678901',
    direccion: 'Av. Santa Fe 5678',
    ciudad: 'Buenos Aires',
    provincia: 'Buenos Aires',
    condicionIVA: 'Responsable Inscripto',
    estado: 'activo'
  },
  {
    tipoDocumento: 'DNI',
    numeroDocumento: '12345678',
    nombre: 'Carlos',
    apellido: 'Rodríguez',
    razonSocial: 'Carlos Rodríguez',
    email: 'carlos@test.com',
    telefono: '1156789012',
    direccion: 'Calle Falsa 999',
    ciudad: 'Rosario',
    provincia: 'Santa Fe',
    condicionIVA: 'Consumidor Final',
    estado: 'activo'
  }
];

// Items de ejemplo
const ITEMS_EJEMPLO = [
  {
    codigo: 'PROD001',
    descripcion: 'Notebook Dell Inspiron 15',
    cantidad: 1,
    unidadMedida: '7', // Unidades
    precioUnitario: 150000
  },
  {
    codigo: 'PROD002',
    descripcion: 'Mouse Logitech MX Master 3',
    cantidad: 2,
    unidadMedida: '7',
    precioUnitario: 15000
  },
  {
    codigo: 'SERV001',
    descripcion: 'Instalación y configuración',
    cantidad: 1,
    unidadMedida: '7',
    precioUnitario: 10000
  }
];

// ==================== FUNCIONES AUXILIARES ====================

function mostrarBanner() {
  console.log('\n' + '='.repeat(60));
  console.log('  AFIP - Sistema de Prueba de Facturación Electrónica');
  console.log('  Ambiente: HOMOLOGACIÓN');
  console.log('='.repeat(60) + '\n');
}

function mostrarMenu() {
  console.log('Escenarios de prueba disponibles:\n');
  console.log('  1 - Factura B (Monotributista) - Sin discriminar IVA');
  console.log('  2 - Factura A (Responsable Inscripto) - Con IVA discriminado');
  console.log('  3 - Factura C (Consumidor Final) - Sin IVA');
  console.log('  4 - Solo validación (sin envío a AFIP)');
  console.log('  5 - Consultar último comprobante autorizado');
  console.log('  6 - Verificar estado del servidor AFIP');
  console.log('  7 - Crear todos los clientes de prueba');
  console.log('  8 - Limpiar facturas de prueba\n');
}

async function conectarDB() {
  console.log('📦 Conectando a MongoDB...');
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI no está configurado en .env');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado a MongoDB\n');
}

async function crearObtenerCliente(datosCliente) {
  let cliente = await Cliente.findOne({ 
    numeroDocumento: datosCliente.numeroDocumento 
  });
  
  if (!cliente) {
    cliente = await Cliente.create(datosCliente);
    console.log(`✅ Cliente creado: ${cliente.razonSocial} (${cliente.numeroDocumento})`);
  } else {
    console.log(`✅ Cliente encontrado: ${cliente.razonSocial} (${cliente.numeroDocumento})`);
  }
  
  return cliente;
}

function calcularTotalesItem(item, alicuotaIVA) {
  const importeBruto = item.cantidad * item.precioUnitario;
  const importeDescuento = 0;
  const importeNeto = importeBruto - importeDescuento;
  const importeIVA = alicuotaIVA > 0 ? (importeNeto * alicuotaIVA) / 100 : 0;
  const importeTotal = importeNeto + importeIVA;

  return {
    ...item,
    importeBruto,
    importeDescuento,
    importeNeto,
    alicuotaIVA,
    importeIVA,
    importeTotal
  };
}

async function crearFacturaPrueba(cliente, tipoFactura, items, observaciones = '') {
  console.log(`\n📝 Creando ${tipoFactura}...`);
  
  // Determinar si lleva IVA
  const alicuotaIVA = tipoFactura === 'FACTURA_A' ? 21 : 0;
  
  // Calcular items con totales
  const itemsConTotales = items.map(item => calcularTotalesItem(item, alicuotaIVA));
  
  const factura = new Factura({
    clienteId: cliente._id,
    tipoComprobante: tipoFactura,
    estado: 'borrador',
    
    // Emisor
    emisorCUIT: EMPRESA.cuit,
    emisorRazonSocial: EMPRESA.razonSocial,
    emisorDomicilio: EMPRESA.domicilio,
    emisorCondicionIVA: EMPRESA.condicionIVA,
    emisorIngresosBrutos: EMPRESA.ingresosBrutos,
    emisorInicioActividades: EMPRESA.inicioActividades,
    
    // Receptor
    receptorTipoDocumento: AFIPService.obtenerCodigoTipoDocumento(cliente.tipoDocumento),
    receptorNumeroDocumento: cliente.numeroDocumento,
    receptorRazonSocial: cliente.razonSocial || `${cliente.nombre} ${cliente.apellido}`,
    receptorDomicilio: cliente.direccion || '-',
    receptorCondicionIVA: cliente.condicionIVA,
    
    // Fechas
    fecha: new Date(),
    
    // Items
    items: itemsConTotales,
    
    // Totales (se calculan automáticamente en el modelo)
    subtotal: 0,
    descuentoTotal: 0,
    importeNetoGravado: 0,
    importeNoGravado: 0,
    importeExento: 0,
    importeIVA: 0,
    importeOtrosTributos: 0,
    importeTotal: 0,
    detalleIVA: [],
    
    // Datos AFIP
    datosAFIP: {
      puntoVenta: EMPRESA.puntoVenta
    },
    
    // Otros
    concepto: 1, // Productos
    monedaId: 'PES',
    cotizacionMoneda: 1,
    observaciones: observaciones || `Factura de prueba - ${tipoFactura}`,
    usuarioCreador: 'test-script'
  });

  await factura.save();
  
  console.log(`✅ Factura creada: ${factura._id}`);
  console.log(`   Tipo: ${factura.tipoComprobante}`);
  console.log(`   Cliente: ${cliente.razonSocial}`);
  console.log(`   Items: ${factura.items.length}`);
  console.log(`   Subtotal: $${factura.subtotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
  if (factura.importeIVA > 0) {
    console.log(`   IVA (21%): $${factura.importeIVA.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
  }
  console.log(`   TOTAL: $${factura.importeTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
  
  return factura;
}

async function validarFactura(factura) {
  console.log('\n🔍 Validando factura...');
  const validacion = AFIPService.validarFactura(factura);
  
  if (validacion.valido) {
    console.log('✅ Factura VÁLIDA - Lista para enviar a AFIP\n');
    return true;
  } else {
    console.log('❌ Factura INVÁLIDA:');
    validacion.errores.forEach(err => console.log(`   ❌ ${err}`));
    console.log();
    return false;
  }
}

async function solicitarCAE(factura) {
  console.log('📤 Solicitando CAE a AFIP...');
  console.log('⏳ Esto puede tomar unos segundos...\n');
  
  try {
    const afipService = new AFIPService(AFIP_CONFIG);
    const resultado = await afipService.solicitarCAE(factura);
    
    if (resultado.resultado === 'A') {
      console.log('✅ ¡CAE OBTENIDO EXITOSAMENTE!\n');
      console.log('📋 Datos del comprobante:');
      console.log(`   CAE: ${resultado.cae}`);
      console.log(`   Número: ${resultado.numeroComprobante}`);
      console.log(`   Fecha autorización: ${resultado.fechaAutorizacion}`);
      console.log(`   Vencimiento CAE: ${resultado.fechaVencimientoCAE}`);
      
      if (resultado.observaciones?.length > 0) {
        console.log('\n⚠️  Observaciones de AFIP:');
        resultado.observaciones.forEach(obs => console.log(`   - ${obs}`));
      }
      
      // Actualizar factura
      factura.datosAFIP.CAE = resultado.cae;
      factura.datosAFIP.CAEVencimiento = resultado.fechaVencimientoCAE;
      factura.datosAFIP.numeroComprobante = resultado.numeroComprobante;
      factura.datosAFIP.numeroSecuencial = parseInt(resultado.numeroComprobante.split('-')[1]);
      factura.datosAFIP.fechaAutorizacion = resultado.fechaAutorizacion;
      factura.datosAFIP.resultado = resultado.resultado;
      factura.datosAFIP.observacionesAFIP = resultado.observaciones;
      factura.estado = 'autorizada';
      await factura.save();
      
      return true;
    } else {
      console.log('❌ FACTURA RECHAZADA POR AFIP\n');
      if (resultado.errores?.length > 0) {
        console.log('Errores:');
        resultado.errores.forEach(err => console.log(`   ❌ ${err}`));
      }
      if (resultado.observaciones?.length > 0) {
        console.log('\nObservaciones:');
        resultado.observaciones.forEach(obs => console.log(`   ⚠️  ${obs}`));
      }
      
      factura.estado = 'rechazada';
      factura.datosAFIP.resultado = resultado.resultado;
      factura.datosAFIP.motivoRechazo = resultado.errores?.join(', ');
      await factura.save();
      
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR al solicitar CAE:', error.message);
    return false;
  }
}

// ==================== ESCENARIOS DE PRUEBA ====================

async function escenario1() {
  console.log('\n' + '─'.repeat(60));
  console.log('ESCENARIO 1: Factura B (Monotributista)');
  console.log('─'.repeat(60));
  
  const cliente = await crearObtenerCliente(CLIENTES_PRUEBA[0]);
  const factura = await crearFacturaPrueba(
    cliente,
    'FACTURA_B',
    ITEMS_EJEMPLO,
    'Factura B de prueba - No discrimina IVA'
  );
  
  const valida = await validarFactura(factura);
  if (!valida) return;
  
  console.log('⚠️  Para solicitar el CAE real, responde SI a continuación.');
  console.log('    (Requiere certificados válidos de AFIP)\n');
  
  return factura;
}

async function escenario2() {
  console.log('\n' + '─'.repeat(60));
  console.log('ESCENARIO 2: Factura A (Responsable Inscripto)');
  console.log('─'.repeat(60));
  
  const cliente = await crearObtenerCliente(CLIENTES_PRUEBA[1]);
  const factura = await crearFacturaPrueba(
    cliente,
    'FACTURA_A',
    ITEMS_EJEMPLO,
    'Factura A de prueba - IVA discriminado'
  );
  
  const valida = await validarFactura(factura);
  if (!valida) return;
  
  console.log('⚠️  Para solicitar el CAE real, responde SI a continuación.');
  console.log('    (Requiere certificados válidos de AFIP)\n');
  
  return factura;
}

async function escenario3() {
  console.log('\n' + '─'.repeat(60));
  console.log('ESCENARIO 3: Factura C (Consumidor Final)');
  console.log('─'.repeat(60));
  
  const cliente = await crearObtenerCliente(CLIENTES_PRUEBA[2]);
  const factura = await crearFacturaPrueba(
    cliente,
    'FACTURA_C',
    ITEMS_EJEMPLO.slice(0, 2), // Solo 2 items
    'Factura C de prueba - Sin IVA'
  );
  
  const valida = await validarFactura(factura);
  if (!valida) return;
  
  console.log('⚠️  Para solicitar el CAE real, responde SI a continuación.');
  console.log('    (Requiere certificados válidos de AFIP)\n');
  
  return factura;
}

async function escenario4() {
  console.log('\n' + '─'.repeat(60));
  console.log('ESCENARIO 4: Solo validación (sin envío)');
  console.log('─'.repeat(60));
  
  for (const clienteData of CLIENTES_PRUEBA) {
    const cliente = await crearObtenerCliente(clienteData);
    const tipoFactura = AFIPService.determinarTipoFactura(
      EMPRESA.condicionIVA,
      cliente.condicionIVA
    );
    const factura = await crearFacturaPrueba(
      cliente,
      tipoFactura,
      ITEMS_EJEMPLO.slice(0, 1),
      `Validación - ${tipoFactura}`
    );
    await validarFactura(factura);
  }
  
  console.log('✅ Validación completada para todos los tipos de factura\n');
}

async function escenario5() {
  console.log('\n' + '─'.repeat(60));
  console.log('ESCENARIO 5: Consultar último comprobante');
  console.log('─'.repeat(60));
  
  try {
    const afipService = new AFIPService(AFIP_CONFIG);
    console.log('\n⏳ Consultando último comprobante en AFIP...\n');
    
    // Consultar para cada tipo de factura
    const tipos = [
      { nombre: 'Factura A', codigo: 1 },
      { nombre: 'Factura B', codigo: 6 },
      { nombre: 'Factura C', codigo: 11 }
    ];
    
    for (const tipo of tipos) {
      try {
        const ultimo = await afipService.obtenerUltimoComprobante(
          EMPRESA.puntoVenta,
          tipo.codigo
        );
        console.log(`${tipo.nombre}: ${String(ultimo).padStart(8, '0')}`);
      } catch (error) {
        console.log(`${tipo.nombre}: Error - ${error.message}`);
      }
    }
    
    console.log();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function escenario6() {
  console.log('\n' + '─'.repeat(60));
  console.log('ESCENARIO 6: Verificar estado del servidor AFIP');
  console.log('─'.repeat(60));
  
  try {
    const afipService = new AFIPService(AFIP_CONFIG);
    console.log('\n⏳ Consultando estado del servidor...\n');
    
    const estado = await afipService.verificarEstadoServidor();
    
    console.log('📊 Estado del servidor AFIP:');
    console.log(`   Servicio: ${estado.servicio}`);
    console.log(`   Estado: ${estado.estado}`);
    console.log(`   Aplicación: ${estado.appserver}`);
    console.log(`   Base de datos: ${estado.dbserver}`);
    console.log(`   Autenticación: ${estado.authserver}`);
    console.log();
    
    if (estado.estado === 'OK') {
      console.log('✅ Servidor AFIP operativo\n');
    } else {
      console.log('⚠️  Servidor AFIP con problemas\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function escenario7() {
  console.log('\n' + '─'.repeat(60));
  console.log('ESCENARIO 7: Crear todos los clientes de prueba');
  console.log('─'.repeat(60) + '\n');
  
  for (const clienteData of CLIENTES_PRUEBA) {
    await crearObtenerCliente(clienteData);
  }
  
  console.log('\n✅ Todos los clientes de prueba están creados\n');
}

async function escenario8() {
  console.log('\n' + '─'.repeat(60));
  console.log('ESCENARIO 8: Limpiar facturas de prueba');
  console.log('─'.repeat(60) + '\n');
  
  const result = await Factura.deleteMany({
    usuarioCreador: 'test-script'
  });
  
  console.log(`✅ ${result.deletedCount} facturas de prueba eliminadas\n`);
}

// ==================== MAIN ====================

async function main() {
  try {
    mostrarBanner();
    
    const escenario = process.argv[2];
    
    if (!escenario) {
      mostrarMenu();
      console.log('Uso: node scripts/test-afip-completo.js [número]');
      console.log('Ejemplo: node scripts/test-afip-completo.js 1\n');
      process.exit(0);
    }
    
    await conectarDB();
    
    let factura;
    
    switch (escenario) {
      case '1':
        factura = await escenario1();
        break;
      case '2':
        factura = await escenario2();
        break;
      case '3':
        factura = await escenario3();
        break;
      case '4':
        await escenario4();
        break;
      case '5':
        await escenario5();
        break;
      case '6':
        await escenario6();
        break;
      case '7':
        await escenario7();
        break;
      case '8':
        await escenario8();
        break;
      default:
        console.log('❌ Escenario no válido\n');
        mostrarMenu();
    }
    
    // Preguntar si desea solicitar CAE (solo para escenarios 1, 2, 3)
    if (factura && ['1', '2', '3'].includes(escenario)) {
      // En Node.js sin readline, simplemente mostramos instrucciones
      console.log('Para solicitar el CAE, edita el script y descomenta la llamada a solicitarCAE()');
      // await solicitarCAE(factura);
    }
    
    console.log('✅ Proceso completado\n');
    
  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado de MongoDB\n');
  }
}

main();
