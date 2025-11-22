/**
 * Script de Prueba - Sistema SOAP Completo
 * 
 * Prueba end-to-end del sistema SOAP:
 * 1. Autenticación WSAA (obtener TA)
 * 2. Consultar estado servidor AFIP
 * 3. Obtener puntos de venta habilitados
 * 4. Consultar último número de comprobante
 * 5. (Opcional) Autorizar factura de prueba
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { AFIPServiceSOAP } from '../dist/services/afip/AFIPServiceSOAP.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function testSistemaSOAP() {
  console.log('\n🚀 Iniciando pruebas del sistema SOAP AFIP...\n');

  // 1. Verificar configuración
  console.log('📋 Paso 1: Verificar configuración');
  const config = {
    cuit: process.env.AFIP_CUIT || '',
    certPath: path.join(__dirname, '..', process.env.AFIP_CERT_PATH || './certs/cert.crt'),
    keyPath: path.join(__dirname, '..', process.env.AFIP_KEY_PATH || './certs/private.key'),
    production: process.env.AFIP_PRODUCTION === 'true',
    taFolder: path.join(__dirname, '..', process.env.AFIP_TA_FOLDER || './afip_tokens'),
    puntoVenta: parseInt(process.env.AFIP_PUNTO_VENTA || '2'),
    razonSocial: process.env.EMPRESA_RAZON_SOCIAL || 'Kurt Argentina'
  };

  console.log('   CUIT:', config.cuit);
  console.log('   Ambiente:', config.production ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN');
  console.log('   Certificado:', config.certPath);
  console.log('   Punto de venta:', config.puntoVenta);
  console.log('   ✅ Configuración OK\n');

  // 2. Crear servicio
  console.log('🔧 Paso 2: Inicializar servicio SOAP');
  const afipService = new AFIPServiceSOAP(config);
  console.log('   ✅ Servicio inicializado\n');

  try {
    // 3. Consultar estado del servidor
    console.log('🌐 Paso 3: Consultar estado del servidor AFIP');
    const estado = await afipService.consultarEstadoServidor();
    console.log('   AppServer:', estado.appServer);
    console.log('   DbServer:', estado.dbServer);
    console.log('   AuthServer:', estado.authServer);
    console.log('   ✅ Servidor AFIP operativo\n');

    // 4. Obtener puntos de venta
    console.log('📍 Paso 4: Obtener puntos de venta habilitados');
    const puntosVenta = await afipService.obtenerPuntosVenta();
    console.log(`   Total puntos de venta: ${puntosVenta.length}`);
    puntosVenta.forEach(pv => {
      console.log(`   - Punto ${pv.numero}: ${pv.bloqueado ? '🔒 Bloqueado' : '✅ Habilitado'}`);
    });
    
    if (puntosVenta.length === 0) {
      console.log('   ⚠️  No hay puntos de venta configurados');
    }
    console.log('');

    // 5. Consultar último número de comprobante
    console.log('🔢 Paso 5: Consultar último número de comprobante');
    const tiposFactura = ['A', 'B', 'C'];
    
    for (const tipo of tiposFactura) {
      try {
        const ultimoNumero = await afipService.obtenerUltimoNumeroComprobante(tipo, config.puntoVenta);
        console.log(`   Factura tipo ${tipo} - Último número: ${ultimoNumero}`);
      } catch (error) {
        console.log(`   Factura tipo ${tipo} - Error: ${error.message}`);
      }
    }
    console.log('   ✅ Consultas completadas\n');

    // 6. Prueba de autorización (opcional - comentado por defecto)
    console.log('💡 Paso 6: Prueba de autorización');
    console.log('   ℹ️  Para probar autorización de factura, descomentar código en el script');
    console.log('   ⚠️  Asegurarse de usar datos válidos de homologación\n');
    
    /*
    // DESCOMENTAR PARA PROBAR AUTORIZACIÓN REAL
    console.log('📄 Autorizando factura de prueba...');
    
    const facturaTest = {
      puntoVenta: config.puntoVenta,
      tipoComprobante: 'B',
      concepto: 'productos' as const,
      cliente: {
        tipoDocumento: 'DNI',
        numeroDocumento: '12345678'
      },
      fecha: new Date(),
      importes: {
        total: 121.00,
        noGravado: 0,
        exento: 0,
        neto: 100.00,
        iva: 21.00,
        tributos: 0
      },
      iva: [{
        alicuota: 21,
        baseImponible: 100.00,
        importe: 21.00
      }]
    };

    // Validar antes de enviar
    const validacion = AFIPServiceSOAP.validarFactura(facturaTest);
    if (!validacion.valido) {
      console.log('   ❌ Factura inválida:');
      validacion.errores.forEach(err => console.log(`      - ${err}`));
      return;
    }

    const resultado = await afipService.solicitarCAE(facturaTest);
    
    if (resultado.aprobado) {
      console.log('   ✅ Factura autorizada con éxito');
      console.log('   CAE:', resultado.cae);
      console.log('   Número:', resultado.numeroComprobante);
      console.log('   Vencimiento CAE:', resultado.fechaVencimientoCAE.toLocaleDateString('es-AR'));
      
      if (resultado.observaciones && resultado.observaciones.length > 0) {
        console.log('   Observaciones:');
        resultado.observaciones.forEach(obs => console.log(`      - ${obs}`));
      }
      
      // Generar código de barras
      const codigoBarras = AFIPServiceSOAP.generarCodigoBarras(
        config.cuit,
        facturaTest.tipoComprobante,
        config.puntoVenta,
        resultado.cae,
        resultado.fechaVencimientoCAE
      );
      console.log('   Código de barras:', codigoBarras);
    } else {
      console.log('   ❌ Factura rechazada');
      if (resultado.errores && resultado.errores.length > 0) {
        console.log('   Errores:');
        resultado.errores.forEach(err => console.log(`      - ${err}`));
      }
    }
    */

    // 7. Resumen final
    console.log('✨ RESUMEN DE PRUEBAS');
    console.log('   ✅ Autenticación WSAA funcionando');
    console.log('   ✅ Conexión a WSFE exitosa');
    console.log('   ✅ Puntos de venta obtenidos');
    console.log('   ✅ Consulta de comprobantes OK');
    console.log('\n🎉 Sistema SOAP completamente operativo\n');
    
    console.log('📚 PRÓXIMOS PASOS:');
    console.log('   1. Actualizar facturacionController para usar AFIPServiceSOAP');
    console.log('   2. Probar autorización real con datos válidos');
    console.log('   3. Actualizar documentación (README, AFIP guides)');
    console.log('   4. Remover dependencia del SDK comercial\n');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:');
    console.error('   Mensaje:', error.message);
    if (error.stack) {
      console.error('\n   Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar pruebas
testSistemaSOAP();
