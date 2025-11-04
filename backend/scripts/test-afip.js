#!/usr/bin/env node

/**
 * Script de prueba para AFIP - Facturación Electrónica
 * 
 * Este script genera facturas de prueba en modo homologación
 * 
 * Uso:
 *   node test-afip.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Cliente from '../src/models/Cliente.js';
import Factura from '../src/models/Factura.js';
import AFIPService from '../src/services/afipService.js';

dotenv.config();

// Configuración de AFIP
const afipConfig = {
  CUIT: process.env.AFIP_CUIT || '',
  cert: process.env.AFIP_CERT_PATH || './certs/cert.crt',
  key: process.env.AFIP_KEY_PATH || './certs/private.key',
  production: false, // SIEMPRE false para testing
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

async function main() {
  try {
    console.log('🚀 Iniciando test de AFIP...\n');

    // Conectar a MongoDB
    console.log('📦 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado a MongoDB\n');

    // Test 1: Crear cliente de prueba
    console.log('👤 Creando cliente de prueba...');
    let cliente = await Cliente.findOne({ numeroDocumento: '20123456789' });
    
    if (!cliente) {
      cliente = await Cliente.create({
        tipoDocumento: 'CUIT',
        numeroDocumento: '20123456789',
        nombre: 'Juan',
        apellido: 'Pérez',
        razonSocial: 'Juan Pérez',
        email: 'juan@test.com',
        telefono: '1234567890',
        direccion: 'Calle Test 456',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        condicionIVA: 'Monotributista',
        estado: 'activo'
      });
      console.log('✅ Cliente creado:', cliente.numeroDocumento);
    } else {
      console.log('✅ Cliente existente:', cliente.numeroDocumento);
    }
    console.log();

    // Test 2: Determinar tipo de factura
    console.log('📄 Determinando tipo de factura...');
    const tipoFactura = AFIPService.determinarTipoFactura(
      EMPRESA.condicionIVA,
      cliente.condicionIVA
    );
    console.log(`✅ Tipo de factura: ${tipoFactura}\n`);

    // Test 3: Crear factura de prueba
    console.log('📝 Creando factura de prueba...');
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
      receptorDomicilio: cliente.direccion,
      receptorCondicionIVA: cliente.condicionIVA,
      
      // Fechas
      fecha: new Date(),
      
      // Items de prueba
      items: [
        {
          codigo: 'TEST001',
          descripcion: 'Producto de prueba 1',
          cantidad: 2,
          unidadMedida: '7',
          precioUnitario: 1000,
          importeBruto: 2000,
          importeDescuento: 0,
          importeNeto: 2000,
          alicuotaIVA: tipoFactura === 'FACTURA_A' ? 21 : 0,
          importeIVA: tipoFactura === 'FACTURA_A' ? 420 : 0,
          importeTotal: tipoFactura === 'FACTURA_A' ? 2420 : 2000
        },
        {
          codigo: 'TEST002',
          descripcion: 'Producto de prueba 2',
          cantidad: 1,
          unidadMedida: '7',
          precioUnitario: 500,
          importeBruto: 500,
          importeDescuento: 0,
          importeNeto: 500,
          alicuotaIVA: tipoFactura === 'FACTURA_A' ? 21 : 0,
          importeIVA: tipoFactura === 'FACTURA_A' ? 105 : 0,
          importeTotal: tipoFactura === 'FACTURA_A' ? 605 : 500
        }
      ],
      
      // Totales (se calculan automáticamente)
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
      concepto: 1,
      monedaId: 'PES',
      cotizacionMoneda: 1,
      observaciones: 'Factura de prueba - Testing AFIP',
      usuarioCreador: 'test-script'
    });

    await factura.save();
    console.log('✅ Factura creada:', factura._id);
    console.log(`   Total: $${factura.importeTotal}\n`);

    // Test 4: Validar factura
    console.log('🔍 Validando factura...');
    const validacion = AFIPService.validarFactura(factura);
    if (validacion.valido) {
      console.log('✅ Factura válida\n');
    } else {
      console.log('❌ Factura inválida:');
      validacion.errores.forEach(err => console.log(`   - ${err}`));
      console.log();
      process.exit(1);
    }

    // Test 5: Solicitar CAE (comentado por defecto)
    console.log('⚠️  Para solicitar CAE, descomenta el código en el script\n');
    
    /*
    // DESCOMENTA ESTE BLOQUE SOLO SI TIENES CERTIFICADOS VÁLIDOS
    console.log('📤 Solicitando CAE a AFIP...');
    const afipService = new AFIPService(afipConfig);
    const resultado = await afipService.solicitarCAE(factura);
    
    if (resultado.resultado === 'A') {
      console.log('✅ CAE obtenido exitosamente!');
      console.log(`   CAE: ${resultado.cae}`);
      console.log(`   Número: ${resultado.numeroComprobante}`);
      console.log(`   Vencimiento: ${resultado.fechaVencimientoCAE}\n`);
      
      // Actualizar factura
      factura.datosAFIP.cae = resultado.cae;
      factura.datosAFIP.fechaVencimientoCAE = resultado.fechaVencimientoCAE;
      factura.datosAFIP.numeroComprobante = resultado.numeroComprobante;
      factura.datosAFIP.numeroSecuencial = parseInt(resultado.numeroComprobante.split('-')[1]);
      factura.estado = 'autorizada';
      await factura.save();
    } else {
      console.log('❌ Factura rechazada por AFIP:');
      resultado.errores?.forEach(err => console.log(`   - ${err}`));
      console.log();
    }
    */

    console.log('✅ Test completado exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`   Cliente: ${cliente.razonSocial} (${cliente.numeroDocumento})`);
    console.log(`   Factura: ${factura.tipoComprobante}`);
    console.log(`   Estado: ${factura.estado}`);
    console.log(`   Total: $${factura.importeTotal}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Desconectado de MongoDB');
  }
}

main();
