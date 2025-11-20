/**
 * Script de migración para unificar enums de medios de pago
 * 
 * Ejecutar desde el directorio backend con:
 * node scripts/migracion-medios-pago-unificados.js
 * 
 * IMPORTANTE: Este script mapea los valores legacy a formato unificado
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mygestor';
const DB_NAME = process.env.MONGO_DB_NAME || 'test';

/**
 * Mapeo de valores legacy a unificados
 */
const MAPEO_MEDIOS_PAGO = {
  // Gastos (con espacios)
  'CHEQUE TERCERO': 'CHEQUE_TERCERO',
  'CHEQUE PROPIO': 'CHEQUE_PROPIO',
  'TARJETA DÉBITO': 'TARJETA_DEBITO',
  'TARJETA CRÉDITO': 'TARJETA_CREDITO',
  'CUENTA CORRIENTE': 'CUENTA_CORRIENTE',
  
  // ReciboPago (valores diferentes)
  'CHEQUE': 'CHEQUE_TERCERO', // Por defecto, cheques recibidos son de terceros
  'TARJETA_DEBITO': 'TARJETA_DEBITO', // Ya unificado
  'TARJETA_CREDITO': 'TARJETA_CREDITO', // Ya unificado
  
  // Valores que no cambian
  'EFECTIVO': 'EFECTIVO',
  'TRANSFERENCIA': 'TRANSFERENCIA',
  'RESERVA': 'OTRO', // RESERVA se mapea a OTRO
  'OTRO': 'OTRO',
  '': 'OTRO' // Vacío se mapea a OTRO
};

/**
 * Función principal de migración
 */
async function migrarMediosPagoUnificados() {
  console.log('='.repeat(60));
  console.log('📋 MIGRACIÓN: Unificar enums de medios de pago');
  console.log('='.repeat(60));
  console.log();

  try {
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    console.log(`   Base de datos: ${DB_NAME}`);
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    console.log('✅ Conexión exitosa');
    console.log();

    // Definir schemas mínimos
    const gastoSchema = new mongoose.Schema({
      medioDePago: String
    }, { collection: 'gastos', strict: false });

    const ventaSchema = new mongoose.Schema({
      medioPago: String
    }, { collection: 'ventas', strict: false });

    const reciboSchema = new mongoose.Schema({
      formasPago: [{
        medioPago: String
      }]
    }, { collection: 'recibospagos', strict: false });

    const Gasto = mongoose.model('Gasto', gastoSchema);
    const Venta = mongoose.model('Venta', ventaSchema);
    const Recibo = mongoose.model('ReciboPago', reciboSchema);

    // 1. Migrar Gastos
    console.log('📊 Analizando tabla Gastos...');
    const gastosAggregate = await Gasto.aggregate([
      { $match: { medioDePago: { $exists: true, $ne: null } } },
      { $group: { _id: '$medioDePago', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);

    console.log('   Distribución actual:');
    gastosAggregate.forEach(g => {
      const unificado = MAPEO_MEDIOS_PAGO[g._id] || g._id;
      const cambio = unificado !== g._id ? ` → ${unificado}` : ' (sin cambio)';
      console.log(`     ${g._id.padEnd(20)}: ${g.cantidad.toString().padStart(5)} registros${cambio}`);
    });
    console.log();

    const bulkOpsGastos = [];
    for (const [legacy, unificado] of Object.entries(MAPEO_MEDIOS_PAGO)) {
      if (legacy === unificado) continue; // Skip si no hay cambio
      
      bulkOpsGastos.push({
        updateMany: {
          filter: { medioDePago: legacy },
          update: { $set: { medioDePago: unificado } }
        }
      });
    }

    if (bulkOpsGastos.length > 0) {
      console.log('🔄 Actualizando Gastos...');
      const resultGastos = await Gasto.bulkWrite(bulkOpsGastos);
      console.log(`✅ Gastos actualizados: ${resultGastos.modifiedCount}`);
    } else {
      console.log('ℹ️  No hay cambios necesarios en Gastos');
    }
    console.log();

    // 2. Migrar Ventas
    console.log('📊 Analizando tabla Ventas...');
    const ventasAggregate = await Venta.aggregate([
      { $match: { medioPago: { $exists: true, $ne: null } } },
      { $group: { _id: '$medioPago', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);

    console.log('   Distribución actual:');
    ventasAggregate.forEach(v => {
      const unificado = MAPEO_MEDIOS_PAGO[v._id] || v._id;
      const cambio = unificado !== v._id ? ` → ${unificado}` : ' (sin cambio)';
      console.log(`     ${v._id.padEnd(20)}: ${v.cantidad.toString().padStart(5)} registros${cambio}`);
    });
    console.log();

    const bulkOpsVentas = [];
    for (const [legacy, unificado] of Object.entries(MAPEO_MEDIOS_PAGO)) {
      if (legacy === unificado) continue;
      
      bulkOpsVentas.push({
        updateMany: {
          filter: { medioPago: legacy },
          update: { $set: { medioPago: unificado } }
        }
      });
    }

    if (bulkOpsVentas.length > 0) {
      console.log('🔄 Actualizando Ventas...');
      const resultVentas = await Venta.bulkWrite(bulkOpsVentas);
      console.log(`✅ Ventas actualizadas: ${resultVentas.modifiedCount}`);
    } else {
      console.log('ℹ️  No hay cambios necesarios en Ventas');
    }
    console.log();

    // 3. Migrar ReciboPago (array de formasPago)
    console.log('📊 Analizando tabla ReciboPago...');
    const recibos = await Recibo.find({ 'formasPago.0': { $exists: true } });
    
    let recibosModificados = 0;
    for (const recibo of recibos) {
      let modificado = false;
      
      for (const formaPago of recibo.formasPago) {
        const medioPagoLegacy = formaPago.medioPago;
        const medioPagoUnificado = MAPEO_MEDIOS_PAGO[medioPagoLegacy] || medioPagoLegacy;
        
        if (medioPagoUnificado !== medioPagoLegacy) {
          formaPago.medioPago = medioPagoUnificado;
          modificado = true;
        }
      }
      
      if (modificado) {
        await recibo.save();
        recibosModificados++;
      }
    }

    console.log(`✅ ReciboPago actualizados: ${recibosModificados}`);
    console.log();

    // 4. Verificación post-migración
    console.log('🔍 Verificando resultados...');
    console.log();
    
    console.log('📊 Distribución FINAL - Gastos:');
    const gastosFinales = await Gasto.aggregate([
      { $match: { medioDePago: { $exists: true, $ne: null } } },
      { $group: { _id: '$medioDePago', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);
    gastosFinales.forEach(g => {
      console.log(`   ${g._id.padEnd(20)}: ${g.cantidad} registros`);
    });
    console.log();

    console.log('📊 Distribución FINAL - Ventas:');
    const ventasFinales = await Venta.aggregate([
      { $match: { medioPago: { $exists: true, $ne: null } } },
      { $group: { _id: '$medioPago', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);
    ventasFinales.forEach(v => {
      console.log(`   ${v._id.padEnd(20)}: ${v.cantidad} registros`);
    });
    console.log();

    // Cerrar conexión
    await mongoose.connection.close();
    console.log('✅ Conexión cerrada');
    console.log();
    console.log('='.repeat(60));
    console.log('✨ Migración finalizada');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('❌ ERROR durante la migración:');
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    console.error();
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
}

// Ejecutar migración
migrarMediosPagoUnificados();
