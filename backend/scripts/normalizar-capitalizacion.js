/**
 * Script para normalizar capitalización de medios de pago
 * 
 * Convierte valores con mayúsculas/minúsculas mixtas al formato estándar:
 * - "Efectivo" → "EFECTIVO"
 * - "Cheque Tercero" → "CHEQUE_TERCERO"
 * - "Cheque Propio" → "CHEQUE_PROPIO"
 * - etc.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mygestor';
const DB_NAME = process.env.MONGO_DB_NAME || 'test';

/**
 * Mapeo completo incluyendo capitalización mixta
 */
const MAPEO_CAPITALIZACION = {
  // Minúsculas/Mixtas → MAYÚSCULAS con guiones bajos
  'efectivo': 'EFECTIVO',
  'Efectivo': 'EFECTIVO',
  
  'transferencia': 'TRANSFERENCIA',
  'Transferencia': 'TRANSFERENCIA',
  
  'cheque tercero': 'CHEQUE_TERCERO',
  'Cheque Tercero': 'CHEQUE_TERCERO',
  'Cheque tercero': 'CHEQUE_TERCERO',
  'cheque Tercero': 'CHEQUE_TERCERO',
  
  'cheque propio': 'CHEQUE_PROPIO',
  'Cheque Propio': 'CHEQUE_PROPIO',
  'Cheque propio': 'CHEQUE_PROPIO',
  'cheque Propio': 'CHEQUE_PROPIO',
  
  'tarjeta débito': 'TARJETA_DEBITO',
  'Tarjeta Débito': 'TARJETA_DEBITO',
  'Tarjeta débito': 'TARJETA_DEBITO',
  'tarjeta Débito': 'TARJETA_DEBITO',
  'Tarjeta Debito': 'TARJETA_DEBITO',
  
  'tarjeta crédito': 'TARJETA_CREDITO',
  'Tarjeta Crédito': 'TARJETA_CREDITO',
  'Tarjeta crédito': 'TARJETA_CREDITO',
  'tarjeta Crédito': 'TARJETA_CREDITO',
  'Tarjeta Credito': 'TARJETA_CREDITO',
  
  'cuenta corriente': 'CUENTA_CORRIENTE',
  'Cuenta Corriente': 'CUENTA_CORRIENTE',
  'Cuenta corriente': 'CUENTA_CORRIENTE',
  'cuenta Corriente': 'CUENTA_CORRIENTE',
  
  'otro': 'OTRO',
  'Otro': 'OTRO',
  'OTRO': 'OTRO',
  
  'reserva': 'OTRO',
  'Reserva': 'OTRO',
  'RESERVA': 'OTRO'
};

async function normalizarCapitalizacion() {
  console.log('='.repeat(60));
  console.log('🔤 NORMALIZACIÓN: Capitalización de medios de pago');
  console.log('='.repeat(60));
  console.log();

  try {
    console.log('🔌 Conectando a MongoDB...');
    console.log(`   Base de datos: ${DB_NAME}`);
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    console.log('✅ Conexión exitosa');
    console.log();

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

    // 1. Normalizar Gastos
    console.log('📊 Analizando Gastos...');
    const gastosAggregate = await Gasto.aggregate([
      { $match: { medioDePago: { $exists: true, $ne: null } } },
      { $group: { _id: '$medioDePago', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);

    console.log('   Distribución actual:');
    let gastosConCambios = 0;
    gastosAggregate.forEach(g => {
      const normalizado = MAPEO_CAPITALIZACION[g._id];
      if (normalizado && normalizado !== g._id) {
        console.log(`     ${g._id.padEnd(25)} → ${normalizado.padEnd(20)} (${g.cantidad} registros)`);
        gastosConCambios += g.cantidad;
      } else {
        console.log(`     ${g._id.padEnd(25)} (sin cambio) (${g.cantidad} registros)`);
      }
    });
    console.log(`\n   Total a actualizar: ${gastosConCambios} gastos`);
    console.log();

    const bulkOpsGastos = [];
    for (const [mixto, normalizado] of Object.entries(MAPEO_CAPITALIZACION)) {
      if (mixto === normalizado) continue;
      
      bulkOpsGastos.push({
        updateMany: {
          filter: { medioDePago: mixto },
          update: { $set: { medioDePago: normalizado } }
        }
      });
    }

    if (bulkOpsGastos.length > 0) {
      console.log('🔄 Normalizando Gastos...');
      const resultGastos = await Gasto.bulkWrite(bulkOpsGastos);
      console.log(`✅ Gastos normalizados: ${resultGastos.modifiedCount}`);
    } else {
      console.log('ℹ️  No hay cambios necesarios en Gastos');
    }
    console.log();

    // 2. Normalizar Ventas
    console.log('📊 Analizando Ventas...');
    const ventasAggregate = await Venta.aggregate([
      { $match: { medioPago: { $exists: true, $ne: null } } },
      { $group: { _id: '$medioPago', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);

    console.log('   Distribución actual:');
    let ventasConCambios = 0;
    ventasAggregate.forEach(v => {
      const normalizado = MAPEO_CAPITALIZACION[v._id];
      if (normalizado && normalizado !== v._id) {
        console.log(`     ${v._id.padEnd(25)} → ${normalizado.padEnd(20)} (${v.cantidad} registros)`);
        ventasConCambios += v.cantidad;
      } else {
        console.log(`     ${v._id.padEnd(25)} (sin cambio) (${v.cantidad} registros)`);
      }
    });
    console.log(`\n   Total a actualizar: ${ventasConCambios} ventas`);
    console.log();

    const bulkOpsVentas = [];
    for (const [mixto, normalizado] of Object.entries(MAPEO_CAPITALIZACION)) {
      if (mixto === normalizado) continue;
      
      bulkOpsVentas.push({
        updateMany: {
          filter: { medioPago: mixto },
          update: { $set: { medioPago: normalizado } }
        }
      });
    }

    if (bulkOpsVentas.length > 0) {
      console.log('🔄 Normalizando Ventas...');
      const resultVentas = await Venta.bulkWrite(bulkOpsVentas);
      console.log(`✅ Ventas normalizadas: ${resultVentas.modifiedCount}`);
    } else {
      console.log('ℹ️  No hay cambios necesarios en Ventas');
    }
    console.log();

    // 3. Normalizar ReciboPago
    console.log('📊 Analizando ReciboPago...');
    const recibos = await Recibo.find({ 'formasPago.0': { $exists: true } });
    
    let recibosModificados = 0;
    for (const recibo of recibos) {
      let modificado = false;
      
      for (const formaPago of recibo.formasPago) {
        const medioPagoMixto = formaPago.medioPago;
        const medioPagoNormalizado = MAPEO_CAPITALIZACION[medioPagoMixto];
        
        if (medioPagoNormalizado && medioPagoNormalizado !== medioPagoMixto) {
          formaPago.medioPago = medioPagoNormalizado;
          modificado = true;
        }
      }
      
      if (modificado) {
        await recibo.save();
        recibosModificados++;
      }
    }

    console.log(`✅ ReciboPago normalizados: ${recibosModificados}`);
    console.log();

    // 4. Verificación final
    console.log('='.repeat(60));
    console.log('🔍 Verificación Final - Distribución normalizada');
    console.log('='.repeat(60));
    console.log();
    
    console.log('📊 GASTOS (después de normalización):');
    const gastosFinales = await Gasto.aggregate([
      { $match: { medioDePago: { $exists: true, $ne: null } } },
      { $group: { _id: '$medioDePago', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);
    gastosFinales.forEach(g => {
      const icono = g._id === g._id.toUpperCase() && g._id.includes('_') ? '✅' : '⚠️';
      console.log(`   ${icono} ${g._id.padEnd(25)}: ${g.cantidad} registros`);
    });
    console.log();

    console.log('📊 VENTAS (después de normalización):');
    const ventasFinales = await Venta.aggregate([
      { $match: { medioPago: { $exists: true, $ne: null } } },
      { $group: { _id: '$medioPago', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } }
    ]);
    ventasFinales.forEach(v => {
      const icono = v._id === v._id.toUpperCase() ? '✅' : '⚠️';
      console.log(`   ${icono} ${v._id.padEnd(25)}: ${v.cantidad} registros`);
    });
    console.log();

    await mongoose.connection.close();
    console.log('✅ Conexión cerrada');
    console.log();
    console.log('='.repeat(60));
    console.log('✨ Normalización finalizada');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('❌ ERROR durante la normalización:');
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    console.error();
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
}

normalizarCapitalizacion();
